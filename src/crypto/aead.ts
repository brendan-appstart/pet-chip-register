import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Authenticated encryption primitive (AES-256-GCM).
 *
 * GCM provides confidentiality AND integrity: `decrypt` verifies the 128-bit
 * authentication tag before returning any plaintext, so tampered ciphertext or
 * a mismatched AAD throws instead of leaking bytes. The tag is appended to the
 * ciphertext by `encrypt` and split off by `decrypt`.
 *
 * A 96-bit random nonce is used. Because callers use a fresh data key per
 * record (see the envelope cipher), nonce reuse under a single key is not a
 * concern at the data layer. For very high write volumes a 192-bit-nonce AEAD
 * (XChaCha20-Poly1305) is the documented drop-in replacement — hence the
 * pluggable `Aead` interface.
 */
export const AES_256_GCM = 'AES-256-GCM';

const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface Aead {
  readonly alg: string;
  readonly keyLength: number;
  readonly nonceLength: number;
  /** Returns a fresh random nonce and ciphertext (with the auth tag appended). */
  encrypt(key: Buffer, plaintext: Buffer, aad: Buffer): { nonce: Buffer; ciphertext: Buffer };
  /** Verifies the tag+AAD and returns plaintext; throws on any mismatch. */
  decrypt(key: Buffer, nonce: Buffer, ciphertext: Buffer, aad: Buffer): Buffer;
}

function assertKey(key: Buffer): void {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`AEAD key must be ${KEY_LENGTH} bytes, got ${key.length}`);
  }
}

export const aesGcmAead: Aead = {
  alg: AES_256_GCM,
  keyLength: KEY_LENGTH,
  nonceLength: NONCE_LENGTH,

  encrypt(key, plaintext, aad) {
    assertKey(key);
    const nonce = randomBytes(NONCE_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(aad);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { nonce, ciphertext: Buffer.concat([enc, tag]) };
  },

  decrypt(key, nonce, ciphertext, aad) {
    assertKey(key);
    if (ciphertext.length < TAG_LENGTH) {
      throw new Error('ciphertext too short to contain an auth tag');
    }
    const tag = ciphertext.subarray(ciphertext.length - TAG_LENGTH);
    const enc = ciphertext.subarray(0, ciphertext.length - TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    // .final() throws "Unsupported state or unable to authenticate data" if the
    // tag/AAD do not verify — integrity is enforced here.
    return Buffer.concat([decipher.update(enc), decipher.final()]);
  },
};
