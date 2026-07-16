import { randomBytes } from 'node:crypto';
import { ulid } from 'ulid';

/**
 * Monotonic, lexicographically sortable identifiers. ULIDs are used for primary
 * keys so that append-only tables (e.g. the audit log) preserve creation order
 * without depending on a database sequence.
 */
export function newId(): string {
  return ulid();
}

/**
 * A high-entropy, URL-safe opaque token (default 256 bits). Used for magic-link
 * tokens, session tokens, and per-pet public tokens. Never guessable, never
 * derived from user data.
 */
export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * A shorter public token for pet QR/URLs (128 bits). Still infeasible to
 * enumerate, but produces a friendlier URL than a full 256-bit token.
 */
export function newPublicToken(): string {
  return randomBytes(16).toString('base64url');
}
