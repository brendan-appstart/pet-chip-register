import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A blind index lets us look a record up by a sensitive value (a microchip
 * number, an email) WITHOUT storing that value in plaintext or in a form that a
 * database leak could reverse.
 *
 * We store `HMAC-SHA256(pepper, namespace ‖ value)` (hex). The HMAC is keyed by
 * a pepper that lives only in the environment (`OPR_INDEX_KEY`), separate from
 * the encryption KEK — so leaking the index gives an attacker neither the
 * plaintext nor any decryption power. The namespace prevents the same value
 * from correlating across contexts (e.g. an email that equals a chip string).
 *
 * The index is deterministic (equal inputs → equal output) so it can back a
 * UNIQUE constraint and an O(1) lookup. That determinism is acceptable here
 * because the input spaces are large/high-entropy relative to the value being
 * protected; the pepper defends against offline brute force of a stolen index.
 */
export interface BlindIndex {
  compute(value: string): string;
  /** Constant-time comparison of a value against a stored index. */
  matches(value: string, storedHex: string): boolean;
}

const SEPARATOR = '\x1f'; // ASCII unit separator; not valid in our inputs

export function createBlindIndex(pepper: Buffer, namespace: string): BlindIndex {
  if (pepper.length < 32) {
    throw new Error('blind-index pepper must be at least 32 bytes');
  }
  function compute(value: string): string {
    return createHmac('sha256', pepper)
      .update(namespace + SEPARATOR + value, 'utf8')
      .digest('hex');
  }
  return {
    compute,
    matches(value, storedHex) {
      const a = Buffer.from(compute(value), 'hex');
      const b = Buffer.from(storedHex, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    },
  };
}
