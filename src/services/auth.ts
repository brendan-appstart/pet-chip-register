import { getConfig } from '@/config/env';
import { getEmailProvider, getRateLimiter } from '@/providers';
import { getEnvelopeCipher, getEmailIndex, sealJson } from '@/crypto';
import { getDb } from '@/db/client';
import type { Owner } from '@/db/schema';
import {
  consumeMagicLinkToken,
  createMagicLinkToken,
  createOwner,
  createSession,
  findOwnerByEmailHash,
  findSessionByTokenHash,
  invalidateOutstandingTokens,
  getOwnerById,
  revokeSession,
  touchSession,
} from '@/db/repositories/auth';
import { appendAudit } from '@/db/repositories/audit';
import { emailDomain, isValidEmail, normalizeEmail } from '@/domain/auth/email';
import { ownerPiiAad, type OwnerPii } from '@/domain/shared/pii';
import { newId, newOpaqueToken } from '@/lib/ids';
import { systemClock, type Clock } from '@/lib/clock';
import { hashToken } from '@/security/hash';
import { err, ok, type Result } from '@/lib/result';

// Re-exported so the app layer can name the owner type without importing `db`.
export type { Owner } from '@/db/schema';

export const SESSION_COOKIE = 'opr_session';
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // update last_seen at most hourly

export interface RequestContext {
  ipHash?: string | null;
  userAgentHash?: string | null;
}

/**
 * Request a magic link. Always returns a neutral success for a well-formed email
 * (no account-existence disclosure). The owner record is created here — when we
 * still hold the plaintext email to encrypt — so that `verify` only needs to
 * mint a session.
 */
export async function requestMagicLink(
  input: { email: string } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ sent: true }, 'invalid_email' | 'rate_limited'>> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return err('invalid_email');

  const db = getDb();
  const now = clock.now();
  const limiter = getRateLimiter();
  const emailHash = getEmailIndex().compute(email);

  const perIp = await limiter.consume(`magic:ip:${input.ipHash ?? 'unknown'}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const perEmail = await limiter.consume(`magic:email:${emailHash}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!perIp.allowed || !perEmail.allowed) return err('rate_limited');

  let owner = await findOwnerByEmailHash(db, emailHash);
  let purpose: 'login' | 'signup' = 'login';
  if (!owner) {
    purpose = 'signup';
    const ownerId = newId();
    const pii = await sealJson<OwnerPii>(getEnvelopeCipher(), { email }, ownerPiiAad(ownerId));
    await createOwner(db, {
      id: ownerId,
      emailLookupHash: emailHash,
      emailLastDomain: emailDomain(email),
      pii,
      now,
    });
    owner = await getOwnerById(db, ownerId);
  }

  // One live link at a time.
  await invalidateOutstandingTokens(db, emailHash, now);
  const rawToken = newOpaqueToken();
  await createMagicLinkToken(db, {
    id: newId(),
    emailLookupHash: emailHash,
    tokenHash: hashToken(rawToken),
    purpose,
    expiresAt: now + MAGIC_LINK_TTL_MS,
    requestIpHash: input.ipHash ?? null,
    now,
  });

  const url = `${getConfig().appUrl}/auth/verify?token=${encodeURIComponent(rawToken)}`;
  await getEmailProvider().send({
    to: email,
    subject: 'Your Open Pet Registry sign-in link',
    text: [
      'Use the link below to sign in to Open Pet Registry.',
      '',
      url,
      '',
      'This link expires in 15 minutes and can be used once.',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
  });

  await appendAudit(db, {
    actorType: 'system',
    action: 'MAGIC_LINK_REQUEST',
    entityType: 'owner',
    entityId: owner?.id ?? null,
    ipHash: input.ipHash ?? null,
    metadata: { purpose },
    occurredAt: now,
  });

  return ok({ sent: true });
}

/**
 * Verify a magic link and mint a session. The token is consumed atomically
 * (single-use); an already-used or expired token yields the same failure.
 */
export async function verifyMagicLink(
  input: { rawToken: string } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ ownerId: string; sessionToken: string; expiresAt: number }, 'invalid_or_expired'>> {
  const db = getDb();
  const now = clock.now();
  const consumed = await consumeMagicLinkToken(db, hashToken(input.rawToken), now);
  if (!consumed) return err('invalid_or_expired');

  const owner = await findOwnerByEmailHash(db, consumed.emailLookupHash);
  if (!owner) return err('invalid_or_expired');

  const sessionToken = newOpaqueToken();
  const expiresAt = now + SESSION_TTL_MS;
  await createSession(db, {
    id: newId(),
    sessionTokenHash: hashToken(sessionToken),
    ownerId: owner.id,
    now,
    expiresAt,
    userAgentHash: input.userAgentHash ?? null,
    ipHash: input.ipHash ?? null,
  });

  await appendAudit(db, {
    actorType: 'owner',
    actorId: owner.id,
    action: 'LOGIN',
    entityType: 'owner',
    entityId: owner.id,
    ipHash: input.ipHash ?? null,
    occurredAt: now,
  });

  return ok({ ownerId: owner.id, sessionToken, expiresAt });
}

/**
 * Sign in (or sign up) an owner from an externally-verified email — used by
 * OAuth. Keyed by the same email blind index as magic-link, so a person using
 * Google and a magic link with the same address maps to one account.
 */
export async function signInWithVerifiedEmail(
  input: { email: string; method: string } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ ownerId: string; sessionToken: string; expiresAt: number }, 'invalid_email'>> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return err('invalid_email');

  const db = getDb();
  const now = clock.now();
  const emailHash = getEmailIndex().compute(email);

  let owner = await findOwnerByEmailHash(db, emailHash);
  if (!owner) {
    const ownerId = newId();
    const pii = await sealJson<OwnerPii>(getEnvelopeCipher(), { email }, ownerPiiAad(ownerId));
    await createOwner(db, {
      id: ownerId,
      emailLookupHash: emailHash,
      emailLastDomain: emailDomain(email),
      pii,
      now,
    });
    owner = await getOwnerById(db, ownerId);
  }
  if (!owner) return err('invalid_email');

  const sessionToken = newOpaqueToken();
  const expiresAt = now + SESSION_TTL_MS;
  await createSession(db, {
    id: newId(),
    sessionTokenHash: hashToken(sessionToken),
    ownerId: owner.id,
    now,
    expiresAt,
    userAgentHash: input.userAgentHash ?? null,
    ipHash: input.ipHash ?? null,
  });

  await appendAudit(db, {
    actorType: 'owner',
    actorId: owner.id,
    action: 'LOGIN',
    entityType: 'owner',
    entityId: owner.id,
    ipHash: input.ipHash ?? null,
    metadata: { method: input.method },
    occurredAt: now,
  });

  return ok({ ownerId: owner.id, sessionToken, expiresAt });
}

/** Resolve the owner for a session cookie, or null if invalid/expired/revoked. */
export async function resolveSession(
  sessionToken: string | undefined,
  clock: Clock = systemClock,
): Promise<Owner | null> {
  if (!sessionToken) return null;
  const db = getDb();
  const now = clock.now();
  const session = await findSessionByTokenHash(db, hashToken(sessionToken));
  if (!session || session.revokedAt || session.expiresAt <= now) return null;

  if (now - session.lastSeenAt > TOUCH_INTERVAL_MS) {
    await touchSession(db, session.id, now);
  }
  const owner = await getOwnerById(db, session.ownerId);
  if (!owner || owner.status !== 'active') return null;
  return owner;
}

export async function logout(
  sessionToken: string | undefined,
  clock: Clock = systemClock,
): Promise<void> {
  if (!sessionToken) return;
  const db = getDb();
  const session = await findSessionByTokenHash(db, hashToken(sessionToken));
  if (session && !session.revokedAt) {
    await revokeSession(db, session.id, clock.now());
  }
}
