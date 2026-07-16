import type { EnvelopeField } from '@/crypto';

/**
 * Map between an `EnvelopeField` (crypto layer) and the five envelope columns on
 * a row. Every PII-bearing table names these columns generically (ciphertext,
 * nonce, wrappedDek, kekId, alg) via the schema's `enc()` helper.
 */
export interface EnvelopeColumns {
  ciphertext: Buffer;
  nonce: Buffer;
  wrappedDek: Buffer;
  kekId: string;
  alg: string;
}

export function toEnvelopeColumns(field: EnvelopeField): EnvelopeColumns {
  return {
    ciphertext: field.ciphertext,
    nonce: field.nonce,
    wrappedDek: field.wrappedDek,
    kekId: field.kekId,
    alg: field.alg,
  };
}

export function fromEnvelopeColumns(row: EnvelopeColumns): EnvelopeField {
  return {
    ciphertext: toBuffer(row.ciphertext),
    nonce: toBuffer(row.nonce),
    wrappedDek: toBuffer(row.wrappedDek),
    kekId: row.kekId,
    alg: row.alg,
  };
}

export interface NullableEnvelopeColumns {
  ciphertext: Buffer | null;
  nonce: Buffer | null;
  wrappedDek: Buffer | null;
  kekId: string | null;
  alg: string | null;
}

export function fromNullableEnvelopeColumns(row: NullableEnvelopeColumns): EnvelopeField | null {
  if (!row.ciphertext || !row.nonce || !row.wrappedDek || !row.kekId || !row.alg) {
    return null;
  }
  return {
    ciphertext: toBuffer(row.ciphertext),
    nonce: toBuffer(row.nonce),
    wrappedDek: toBuffer(row.wrappedDek),
    kekId: row.kekId,
    alg: row.alg,
  };
}

// libSQL may return blobs as Uint8Array; normalize to Buffer for the crypto API.
function toBuffer(v: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(v) ? v : Buffer.from(v);
}
