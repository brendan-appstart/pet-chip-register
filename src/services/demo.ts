import { count } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { getEnvelopeCipher, getEmailIndex, sealJson } from '@/crypto';
import { createOwner, findOwnerByEmailHash } from '@/db/repositories/auth';
import { lookupEvents, microchips, owners, pets } from '@/db/schema';
import { ownerPiiAad } from '@/domain/shared/pii';
import { newId } from '@/lib/ids';
import type { Db } from '@/db/client';
import { registerPet } from './pets';
import { setLostMode } from './lostMode';

/**
 * Demo-data seeding, shared by the CLI seed script and the /admin screen. It is
 * idempotent: demo pets key off fixed microchip numbers, so re-running is a
 * no-op once they exist. Intended for development and demos, not production.
 */

export interface DemoPet {
  pet: string;
  owner: string;
  chip: string;
  publicToken: string;
  lost: boolean;
}

export interface DemoResult {
  created: DemoPet[];
  alreadyPresent: boolean;
}

async function ensureOwner(db: Db, email: string, displayName: string): Promise<string> {
  const emailHash = getEmailIndex().compute(email);
  const existing = await findOwnerByEmailHash(db, emailHash);
  if (existing) return existing.id;
  const id = newId();
  const pii = await sealJson(getEnvelopeCipher(), { email, displayName }, ownerPiiAad(id));
  await createOwner(db, { id, emailLookupHash: emailHash, pii, now: Date.now() });
  return id;
}

const DEMO_PETS = [
  { owner: 'alice@example.org', name: 'Milo', species: 'Dog', breed: 'Beagle', color: 'Tan & white', chip: '985141000000001', lost: false },
  { owner: 'bob@example.org', name: 'Luna', species: 'Cat', breed: 'Domestic shorthair', color: 'Black', chip: '985141000000002', lost: true },
  { owner: 'alice@example.org', name: 'Rex', species: 'Dog', breed: 'German Shepherd', color: 'Black & tan', chip: '985141000000003', lost: false },
  { owner: 'bob@example.org', name: 'Pip', species: 'Dog', breed: 'Corgi', color: 'Red & white', chip: '985141000000004', lost: false },
] as const;

export async function seedDemoData(): Promise<DemoResult> {
  const db = getDb();
  const ownerIds: Record<string, string> = {
    'alice@example.org': await ensureOwner(db, 'alice@example.org', 'Alice Rivera'),
    'bob@example.org': await ensureOwner(db, 'bob@example.org', 'Bob Chen'),
  };

  const created: DemoPet[] = [];
  for (const d of DEMO_PETS) {
    const res = await registerPet({
      ownerId: ownerIds[d.owner]!,
      name: d.name,
      species: d.species,
      breed: d.breed,
      color: d.color,
      chipNumber: d.chip,
    });
    if (!res.ok) continue; // chip_taken → already seeded; skip
    if (d.lost) {
      await setLostMode({
        ownerId: ownerIds[d.owner]!,
        petId: res.value.petId,
        isLost: true,
        lastSeenLocation: 'Near Riverside Park',
        reward: '$100',
        publicMessage: 'Shy — please do not chase; call instead.',
      });
    }
    created.push({ pet: d.name, owner: d.owner, chip: d.chip, publicToken: res.value.publicToken, lost: d.lost });
  }

  return { created, alreadyPresent: created.length === 0 };
}

export interface RegistryStats {
  owners: number;
  pets: number;
  microchips: number;
  lookups: number;
}

export async function getRegistryStats(): Promise<RegistryStats> {
  const db = getDb();
  const [o, p, m, l] = await Promise.all([
    db.select({ c: count() }).from(owners),
    db.select({ c: count() }).from(pets),
    db.select({ c: count() }).from(microchips),
    db.select({ c: count() }).from(lookupEvents),
  ]);
  return {
    owners: o[0]?.c ?? 0,
    pets: p[0]?.c ?? 0,
    microchips: m[0]?.c ?? 0,
    lookups: l[0]?.c ?? 0,
  };
}
