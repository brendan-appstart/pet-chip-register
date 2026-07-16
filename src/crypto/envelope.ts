import { randomBytes } from 'node:crypto';
import { canonicalBytes } from '@/lib/canonicalJson';
import type { Aead } from './aead';
import type { Keyring, KekId } from './keyring';

/**
 * Envelope encryption.
 *
 * Every protected record gets its own random 256-bit data-encryption-key (DEK).
 * The DEK encrypts the record's plaintext; the DEK itself is then wrapped
 * (encrypted) by the active KEK from the keyring. Only the wrapped DEK,
 * ciphertext, nonce, algorithm, and KEK id are persisted — never the DEK or KEK.
 *
 * This design buys three properties the charter demands:
 *  - **Rotation is cheap.** Rotating the KEK only re-wraps DEKs (`rewrap`); the
 *    much larger record ciphertext is untouched because the DEK is unchanged.
 *  - **Crypto-shredding.** Destroying a single record's wrapped DEK renders that
 *    record permanently unrecoverable — the basis for hard deletion / erasure.
 *  - **Integrity binding.** The `aad` binds ciphertext to the owning entity,
 *    purpose, and schema version, so rows cannot be swapped or replayed.
 */

export interface EnvelopeField {
  readonly alg: string;
  readonly kekId: KekId;
  readonly nonce: Buffer;
  readonly ciphertext: Buffer;
  readonly wrappedDek: Buffer;
}

export interface EnvelopeCipher {
  seal(plaintext: Buffer, aad: Buffer): Promise<EnvelopeField>;
  open(field: EnvelopeField, aad: Buffer): Promise<Buffer>;
  /** Re-wrap a record's DEK under the active KEK (used for key rotation). */
  rewrap(field: EnvelopeField): Promise<EnvelopeField>;
}

const DEK_LENGTH = 32;

function wrapAad(kekId: KekId): Buffer {
  return Buffer.from(`dek-wrap:v1:${kekId}`, 'utf8');
}

/** Wrapped DEK layout: [ wrap-nonce | wrapped-dek-ciphertext(+tag) ]. */
function packWrapped(nonce: Buffer, ciphertext: Buffer): Buffer {
  return Buffer.concat([nonce, ciphertext]);
}

export function createEnvelopeCipher(aead: Aead, keyring: Keyring): EnvelopeCipher {
  /** Wrap a DEK (as plaintext) under the named KEK. */
  async function wrapDek(dek: Buffer, kekId: KekId): Promise<Buffer> {
    const kek = await keyring.getKek(kekId);
    try {
      const { nonce, ciphertext } = aead.encrypt(kek, dek, wrapAad(kekId));
      return packWrapped(nonce, ciphertext);
    } finally {
      kek.fill(0);
    }
  }

  /** Unwrap a DEK previously wrapped under the named KEK. */
  async function unwrapDek(wrapped: Buffer, kekId: KekId): Promise<Buffer> {
    const kek = await keyring.getKek(kekId);
    try {
      const nonce = wrapped.subarray(0, aead.nonceLength);
      const ciphertext = wrapped.subarray(aead.nonceLength);
      return aead.decrypt(kek, nonce, ciphertext, wrapAad(kekId));
    } finally {
      kek.fill(0);
    }
  }

  return {
    async seal(plaintext, aad) {
      const kekId = keyring.activeKekId();
      const dek = randomBytes(DEK_LENGTH);
      try {
        const { nonce, ciphertext } = aead.encrypt(dek, plaintext, aad);
        const wrappedDek = await wrapDek(dek, kekId);
        return { alg: aead.alg, kekId, nonce, ciphertext, wrappedDek };
      } finally {
        dek.fill(0);
      }
    },

    async open(field, aad) {
      const dek = await unwrapDek(field.wrappedDek, field.kekId);
      try {
        return aead.decrypt(dek, field.nonce, field.ciphertext, aad);
      } finally {
        dek.fill(0);
      }
    },

    async rewrap(field) {
      const dek = await unwrapDek(field.wrappedDek, field.kekId);
      try {
        const activeId = keyring.activeKekId();
        const wrappedDek = await wrapDek(dek, activeId);
        return { ...field, kekId: activeId, wrappedDek };
      } finally {
        dek.fill(0);
      }
    },
  };
}

/** Seal a JSON-serializable value; the string aad is bound as associated data. */
export async function sealJson<T>(
  cipher: EnvelopeCipher,
  value: T,
  aad: string,
): Promise<EnvelopeField> {
  return cipher.seal(canonicalBytes(value), Buffer.from(aad, 'utf8'));
}

/** Open a sealed field and parse it back into a value. */
export async function openJson<T>(
  cipher: EnvelopeCipher,
  field: EnvelopeField,
  aad: string,
): Promise<T> {
  const bytes = await cipher.open(field, Buffer.from(aad, 'utf8'));
  return JSON.parse(bytes.toString('utf8')) as T;
}
