import { getRateLimiter, getStorage } from '@/providers';
import { getDb } from '@/db/client';
import { getLostMode, getPetByPublicToken, listPetPhotos } from '@/db/repositories/pets';
import { appendAudit } from '@/db/repositories/audit';
import { neutralAck, rateLimitedAck, type LookupAck } from '@/domain/lookup/policy';
import type { FinderRelay } from '@/domain/shared/pii';
import { systemClock, type Clock } from '@/lib/clock';
import { notifyOwnersOfContact } from './notify';

/** Privacy-preserving public view of a pet (no owner PII, ever). */
export interface PublicPetView {
  token: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  description: string | null;
  photoUrl: string | null;
  photos: string[];
  isLost: boolean;
  lastSeenLocation: string | null;
  reward: string | null;
  publicMessage: string | null;
}

export async function getPublicPetView(token: string): Promise<PublicPetView | null> {
  const db = getDb();
  const pet = await getPetByPublicToken(db, token);
  if (!pet || pet.status !== 'active') return null;
  const storage = getStorage();
  const lm = await getLostMode(db, pet.id);
  const photoUrl = pet.photoStorageKey ? await storage.getUrl(pet.photoStorageKey) : null;
  const photoRows = await listPetPhotos(db, pet.id);
  const photos = await Promise.all(photoRows.map((p) => storage.getUrl(p.storageKey)));
  return {
    token: pet.publicToken,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    color: pet.color,
    description: pet.description,
    photoUrl,
    photos,
    isLost: lm?.isLost ?? false,
    lastSeenLocation: lm?.lastSeenLocation ?? null,
    reward: lm?.reward ?? null,
    publicMessage: lm?.publicMessage ?? null,
  };
}

/**
 * A finder contacts the owner from the pet's public page (the chip-less path,
 * e.g. after scanning a QR tag). Same one-directional relay: the owner is
 * notified; the finder never sees owner details.
 */
export async function contactViaPublicToken(
  input: { token: string; finder: FinderRelay; ipHash?: string | null },
  clock: Clock = systemClock,
): Promise<LookupAck> {
  const db = getDb();
  const now = clock.now();
  const pet = await getPetByPublicToken(db, input.token);
  if (!pet || pet.status !== 'active') return neutralAck();

  const rl = await getRateLimiter().consume(`pubcontact:ip:${input.ipHash ?? 'unknown'}`, {
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (!rl.allowed) return rateLimitedAck(Math.ceil(rl.retryAfterMs / 1000));

  await notifyOwnersOfContact({
    petId: pet.id,
    finder: input.finder,
    via: 'public_page',
    now,
    ipHash: input.ipHash ?? null,
  });

  await appendAudit(db, {
    actorType: 'finder',
    action: 'PUBLIC_CONTACT',
    entityType: 'pet',
    entityId: pet.id,
    ipHash: input.ipHash ?? null,
    occurredAt: now,
  });

  return neutralAck();
}
