import { getConfig } from '@/config/env';
import { getEnvelopeCipher, openJson, sealJson } from '@/crypto';
import { getDb } from '@/db/client';
import { getOwnerById, ownerPiiEnvelope, updateOwnerPii } from '@/db/repositories/auth';
import { appendAudit } from '@/db/repositories/audit';
import { ownerPiiAad, type OwnerPii } from '@/domain/shared/pii';
import { systemClock, type Clock } from '@/lib/clock';

/**
 * Whether an owner may use the /admin screen: their email is in ADMIN_EMAILS,
 * or we're in development (convenience for local demos).
 */
export async function isAdmin(ownerId: string): Promise<boolean> {
  const cfg = getConfig();
  const profile = await getOwnerProfile(ownerId);
  if (!profile) return false;
  if (cfg.adminEmails.includes(profile.email.toLowerCase())) return true;
  return cfg.nodeEnv === 'development';
}

export async function getOwnerProfile(ownerId: string): Promise<OwnerPii | null> {
  const db = getDb();
  const owner = await getOwnerById(db, ownerId);
  if (!owner) return null;
  return openJson<OwnerPii>(getEnvelopeCipher(), ownerPiiEnvelope(owner), ownerPiiAad(owner.id));
}

/**
 * Update the owner's contact details. The email (the account key) is preserved
 * from the existing record; only display name / phone / address change here.
 */
export async function updateOwnerProfile(
  input: { ownerId: string; displayName?: string; phone?: string; address?: string },
  clock: Clock = systemClock,
): Promise<{ ok: boolean }> {
  const db = getDb();
  const owner = await getOwnerById(db, input.ownerId);
  if (!owner) return { ok: false };
  const cipher = getEnvelopeCipher();
  const current = await openJson<OwnerPii>(cipher, ownerPiiEnvelope(owner), ownerPiiAad(owner.id));
  const next: OwnerPii = {
    email: current.email,
    displayName: input.displayName?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
  };
  const sealed = await sealJson(cipher, next, ownerPiiAad(owner.id));
  await updateOwnerPii(db, owner.id, sealed, clock.now());
  await appendAudit(db, {
    actorType: 'owner',
    actorId: owner.id,
    action: 'PROFILE_UPDATE',
    entityType: 'owner',
    entityId: owner.id,
    occurredAt: clock.now(),
  });
  return { ok: true };
}
