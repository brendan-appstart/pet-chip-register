import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { magicLinkTokens, owners, sessions } from '@/db/schema';
import type { MagicLinkToken, Owner, Session } from '@/db/schema';
import type { EnvelopeField } from '@/crypto';
import { fromEnvelopeColumns, toEnvelopeColumns } from './envelope';

// --- Owners ------------------------------------------------------------------

export async function findOwnerByEmailHash(
  db: Db,
  emailLookupHash: string,
): Promise<Owner | undefined> {
  return (
    await db.select().from(owners).where(eq(owners.emailLookupHash, emailLookupHash)).limit(1)
  )[0];
}

export async function getOwnerById(db: Db, id: string): Promise<Owner | undefined> {
  return (await db.select().from(owners).where(eq(owners.id, id)).limit(1))[0];
}

export async function createOwner(
  db: Db,
  params: {
    id: string;
    emailLookupHash: string;
    emailLastDomain?: string;
    pii: EnvelopeField;
    now: number;
  },
): Promise<void> {
  await db.insert(owners).values({
    id: params.id,
    emailLookupHash: params.emailLookupHash,
    emailLastDomain: params.emailLastDomain ?? null,
    ...toEnvelopeColumns(params.pii),
    status: 'active',
    createdAt: params.now,
    updatedAt: params.now,
  });
}

export async function updateOwnerPii(
  db: Db,
  id: string,
  pii: EnvelopeField,
  now: number,
): Promise<void> {
  await db
    .update(owners)
    .set({ ...toEnvelopeColumns(pii), updatedAt: now })
    .where(eq(owners.id, id));
}

export function ownerPiiEnvelope(owner: Owner): EnvelopeField {
  return fromEnvelopeColumns(owner);
}

// --- Magic-link tokens -------------------------------------------------------

export async function createMagicLinkToken(
  db: Db,
  params: {
    id: string;
    emailLookupHash: string;
    tokenHash: string;
    purpose: 'login' | 'signup';
    expiresAt: number;
    requestIpHash?: string | null;
    now: number;
  },
): Promise<void> {
  await db.insert(magicLinkTokens).values({
    id: params.id,
    emailLookupHash: params.emailLookupHash,
    tokenHash: params.tokenHash,
    purpose: params.purpose,
    expiresAt: params.expiresAt,
    requestIpHash: params.requestIpHash ?? null,
    createdAt: params.now,
  });
}

/**
 * Atomically consume a token: the single UPDATE ... WHERE consumed_at IS NULL
 * guarantees exactly one caller can win, even under concurrent verify attempts
 * (and defeats replay of an already-used link).
 */
export async function consumeMagicLinkToken(
  db: Db,
  tokenHash: string,
  now: number,
): Promise<MagicLinkToken | undefined> {
  const rows = await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        isNull(magicLinkTokens.consumedAt),
        gt(magicLinkTokens.expiresAt, now),
      ),
    )
    .returning();
  return rows[0];
}

/** Invalidate any outstanding links for an email when a new one is requested. */
export async function invalidateOutstandingTokens(
  db: Db,
  emailLookupHash: string,
  now: number,
): Promise<void> {
  await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(
      and(eq(magicLinkTokens.emailLookupHash, emailLookupHash), isNull(magicLinkTokens.consumedAt)),
    );
}

// --- Sessions ----------------------------------------------------------------

export async function createSession(
  db: Db,
  params: {
    id: string;
    sessionTokenHash: string;
    ownerId: string;
    now: number;
    expiresAt: number;
    userAgentHash?: string | null;
    ipHash?: string | null;
  },
): Promise<void> {
  await db.insert(sessions).values({
    id: params.id,
    sessionTokenHash: params.sessionTokenHash,
    ownerId: params.ownerId,
    createdAt: params.now,
    expiresAt: params.expiresAt,
    lastSeenAt: params.now,
    userAgentHash: params.userAgentHash ?? null,
    ipHash: params.ipHash ?? null,
  });
}

export async function findSessionByTokenHash(
  db: Db,
  sessionTokenHash: string,
): Promise<Session | undefined> {
  return (
    await db.select().from(sessions).where(eq(sessions.sessionTokenHash, sessionTokenHash)).limit(1)
  )[0];
}

export async function touchSession(db: Db, id: string, lastSeenAt: number): Promise<void> {
  await db.update(sessions).set({ lastSeenAt }).where(eq(sessions.id, id));
}

export async function revokeSession(db: Db, id: string, revokedAt: number): Promise<void> {
  await db.update(sessions).set({ revokedAt }).where(eq(sessions.id, id));
}
