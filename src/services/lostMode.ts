import { getDb } from '@/db/client';
import { isOwnerOfPet, upsertLostMode } from '@/db/repositories/pets';
import { appendAudit } from '@/db/repositories/audit';
import { newId } from '@/lib/ids';
import { systemClock, type Clock } from '@/lib/clock';
import { err, ok, type Result } from '@/lib/result';
import type { RequestContext } from './auth';

export async function setLostMode(
  input: {
    ownerId: string;
    petId: string;
    isLost: boolean;
    lastSeenLocation?: string;
    reward?: string;
    publicMessage?: string;
  } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ isLost: boolean }, 'forbidden'>> {
  const db = getDb();
  const now = clock.now();
  if (!(await isOwnerOfPet(db, input.ownerId, input.petId))) return err('forbidden');

  await upsertLostMode(db, {
    id: newId(),
    petId: input.petId,
    isLost: input.isLost,
    lostSince: input.isLost ? now : null,
    foundAt: input.isLost ? null : now,
    lastSeenLocation: input.lastSeenLocation?.trim() || null,
    reward: input.reward?.trim() || null,
    publicMessage: input.publicMessage?.trim() || null,
    updatedBy: input.ownerId,
    now,
  });

  await appendAudit(db, {
    actorType: 'owner',
    actorId: input.ownerId,
    action: input.isLost ? 'LOST_MODE_ON' : 'LOST_MODE_OFF',
    entityType: 'pet',
    entityId: input.petId,
    ipHash: input.ipHash ?? null,
    occurredAt: now,
  });

  return ok({ isLost: input.isLost });
}
