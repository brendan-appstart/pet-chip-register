import { describe, expect, it } from 'vitest';
import { aesGcmAead } from '@/crypto/aead';
import { createEnvKeyring } from '@/crypto/keyring';
import { createEnvelopeCipher, sealJson, openJson } from '@/crypto/envelope';

const KEK_A = Buffer.alloc(32, 0xa1).toString('base64');
const KEK_B = Buffer.alloc(32, 0xb2).toString('base64');

function cipherWith(activeKekId: string, keks: Record<string, string>) {
  const keyring = createEnvKeyring({ activeKekId, keks });
  return { keyring, cipher: createEnvelopeCipher(aesGcmAead, keyring) };
}

const OWNER_AAD = 'owner:01ABC:pii:v1';

describe('envelope cipher', () => {
  it('round-trips a JSON payload', async () => {
    const { cipher } = cipherWith('a', { a: KEK_A });
    const pii = { email: 'jo@example.org', displayName: 'Jo', phone: '+15550001111' };
    const field = await sealJson(cipher, pii, OWNER_AAD);
    const back = await openJson<typeof pii>(cipher, field, OWNER_AAD);
    expect(back).toEqual(pii);
  });

  it('never stores plaintext in the sealed field', async () => {
    const { cipher } = cipherWith('a', { a: KEK_A });
    const field = await sealJson(cipher, { email: 'secret@example.org' }, OWNER_AAD);
    const haystack = Buffer.concat([field.ciphertext, field.wrappedDek, field.nonce]).toString(
      'latin1',
    );
    expect(haystack).not.toContain('secret@example.org');
    expect(field.alg).toBe('AES-256-GCM');
  });

  it('rejects a tampered ciphertext (integrity)', async () => {
    const { cipher } = cipherWith('a', { a: KEK_A });
    const field = await sealJson(cipher, { x: 1 }, OWNER_AAD);
    const tampered = Buffer.from(field.ciphertext);
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    await expect(cipher.open({ ...field, ciphertext: tampered }, Buffer.from(OWNER_AAD))).rejects.toThrow();
  });

  it('rejects a mismatched AAD (context binding)', async () => {
    const { cipher } = cipherWith('a', { a: KEK_A });
    const field = await sealJson(cipher, { x: 1 }, OWNER_AAD);
    await expect(openJson(cipher, field, 'owner:OTHER:pii:v1')).rejects.toThrow();
  });

  it('rejects decryption under the wrong KEK', async () => {
    const sealed = await sealJson(cipherWith('a', { a: KEK_A }).cipher, { x: 1 }, OWNER_AAD);
    // A cipher that knows a different key under the same id cannot unwrap the DEK.
    const wrong = cipherWith('a', { a: KEK_B }).cipher;
    await expect(wrong.open(sealed, Buffer.from(OWNER_AAD))).rejects.toThrow();
  });

  it('rewrap migrates the DEK to the active KEK while preserving plaintext', async () => {
    // Seal under KEK "a".
    const sealed = await sealJson(cipherWith('a', { a: KEK_A }).cipher, { note: 'keep me' }, OWNER_AAD);
    expect(sealed.kekId).toBe('a');

    // Now the active key is "b"; both keys are known so rewrap can unwrap+rewrap.
    const rotated = cipherWith('b', { a: KEK_A, b: KEK_B }).cipher;
    const rewrapped = await rotated.rewrap(sealed);
    expect(rewrapped.kekId).toBe('b');
    // Data ciphertext/nonce are unchanged (only the DEK wrapper changed).
    expect(rewrapped.ciphertext.equals(sealed.ciphertext)).toBe(true);
    expect(rewrapped.nonce.equals(sealed.nonce)).toBe(true);

    // A cipher that only knows the new active key can still read the record.
    const newOnly = cipherWith('b', { b: KEK_B }).cipher;
    expect(await openJson<{ note: string }>(newOnly, rewrapped, OWNER_AAD)).toEqual({ note: 'keep me' });
  });

  it('produces a unique nonce/DEK per seal', async () => {
    const { cipher } = cipherWith('a', { a: KEK_A });
    const f1 = await sealJson(cipher, { x: 1 }, OWNER_AAD);
    const f2 = await sealJson(cipher, { x: 1 }, OWNER_AAD);
    expect(f1.nonce.equals(f2.nonce)).toBe(false);
    expect(f1.wrappedDek.equals(f2.wrappedDek)).toBe(false);
    expect(f1.ciphertext.equals(f2.ciphertext)).toBe(false);
  });

  it('throws a clear error for an unknown KEK id', async () => {
    const { cipher } = cipherWith('missing', {});
    await expect(sealJson(cipher, { x: 1 }, OWNER_AAD)).rejects.toThrow(/KEK "missing"/);
  });
});
