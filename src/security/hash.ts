import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * One-way hashing for non-reversible identifiers we store for security/audit
 * purposes: magic-link tokens, session tokens, and coarse IP/user-agent hashes.
 *
 * These are plain SHA-256 (not the keyed blind index): the inputs are already
 * high-entropy secrets (256-bit tokens) so a pepper adds little, and for IPs we
 * intentionally accept that equal IPs hash equally to support abuse throttling.
 */
export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256')
    .update(typeof input === 'string' ? Buffer.from(input, 'utf8') : input)
    .digest('hex');
}

/** Hash a bearer token (magic-link / session) for at-rest storage. */
export function hashToken(rawToken: string): string {
  return sha256Hex(rawToken);
}

/** A short, non-identifying hash of an IP or user-agent for rate-limiting/audit. */
export function hashClientAttribute(value: string | undefined | null): string | null {
  if (!value) return null;
  return sha256Hex(value).slice(0, 32);
}

/** Constant-time equality for two hex-encoded hashes. */
export function hashesEqual(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export { randomBytes };
