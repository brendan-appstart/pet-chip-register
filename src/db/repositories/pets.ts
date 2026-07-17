import { and, asc, count, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/db/client';
import {
  emergencyContacts,
  lostModeStatus,
  microchips,
  ownerPetLinks,
  petPhotos,
  pets,
} from '@/db/schema';
import type {
  EmergencyContact,
  LostModeStatus,
  Microchip,
  Pet,
  PetPhoto,
} from '@/db/schema';
import type { EnvelopeField } from '@/crypto';
import { toEnvelopeColumns } from './envelope';

// --- Pets --------------------------------------------------------------------

export interface NewPet {
  id: string;
  publicToken: string;
  name: string;
  species: string;
  breed?: string | null;
  color?: string | null;
  sex?: string | null;
  description?: string | null;
  primaryOwnerId: string;
  now: number;
}

export async function createPet(db: Db, p: NewPet): Promise<void> {
  await db.insert(pets).values({
    id: p.id,
    publicToken: p.publicToken,
    name: p.name,
    species: p.species,
    breed: p.breed ?? null,
    color: p.color ?? null,
    sex: p.sex ?? null,
    description: p.description ?? null,
    primaryOwnerId: p.primaryOwnerId,
    status: 'active',
    createdAt: p.now,
    updatedAt: p.now,
  });
}

export async function getPetById(db: Db, id: string): Promise<Pet | undefined> {
  return (await db.select().from(pets).where(eq(pets.id, id)).limit(1))[0];
}

export async function getPetByPublicToken(db: Db, token: string): Promise<Pet | undefined> {
  return (await db.select().from(pets).where(eq(pets.publicToken, token)).limit(1))[0];
}

export async function listPetsForOwner(db: Db, ownerId: string): Promise<Pet[]> {
  const rows = await db
    .select({ pet: pets })
    .from(ownerPetLinks)
    .innerJoin(pets, eq(ownerPetLinks.petId, pets.id))
    .where(eq(ownerPetLinks.ownerId, ownerId))
    .orderBy(asc(pets.createdAt));
  return rows.map((r) => r.pet);
}

export async function updatePet(
  db: Db,
  id: string,
  fields: Partial<Pick<Pet, 'name' | 'species' | 'breed' | 'color' | 'sex' | 'description' | 'status'>>,
  now: number,
): Promise<void> {
  await db.update(pets).set({ ...fields, updatedAt: now }).where(eq(pets.id, id));
}

export async function setPetPhotoKey(
  db: Db,
  id: string,
  photoStorageKey: string,
  now: number,
): Promise<void> {
  await db.update(pets).set({ photoStorageKey, updatedAt: now }).where(eq(pets.id, id));
}

// --- Owner ↔ Pet links -------------------------------------------------------

export async function linkOwnerPet(
  db: Db,
  params: { id: string; ownerId: string; petId: string; role?: string; now: number },
): Promise<void> {
  await db.insert(ownerPetLinks).values({
    id: params.id,
    ownerId: params.ownerId,
    petId: params.petId,
    role: params.role ?? 'owner',
    createdAt: params.now,
  });
}

export async function isOwnerOfPet(db: Db, ownerId: string, petId: string): Promise<boolean> {
  const row = (
    await db
      .select({ id: ownerPetLinks.id })
      .from(ownerPetLinks)
      .where(and(eq(ownerPetLinks.ownerId, ownerId), eq(ownerPetLinks.petId, petId)))
      .limit(1)
  )[0];
  return row !== undefined;
}

export async function listOwnerIdsForPet(db: Db, petId: string): Promise<string[]> {
  const rows = await db
    .select({ ownerId: ownerPetLinks.ownerId })
    .from(ownerPetLinks)
    .where(eq(ownerPetLinks.petId, petId));
  return rows.map((r) => r.ownerId);
}

// --- Microchips --------------------------------------------------------------

export async function createChip(
  db: Db,
  params: {
    id: string;
    petId: string;
    chipNumberHash: string;
    chipLast4: string;
    chip: EnvelopeField;
    brand?: string | null;
    now: number;
  },
): Promise<void> {
  await db.insert(microchips).values({
    id: params.id,
    petId: params.petId,
    chipNumberHash: params.chipNumberHash,
    chipLast4: params.chipLast4,
    ...toEnvelopeColumns(params.chip),
    brand: params.brand ?? null,
    createdAt: params.now,
    updatedAt: params.now,
  });
}

/** The hot, enumeration-resistant lookup: chip hash → registration. */
export async function findChipByHash(
  db: Db,
  chipNumberHash: string,
): Promise<Microchip | undefined> {
  return (
    await db.select().from(microchips).where(eq(microchips.chipNumberHash, chipNumberHash)).limit(1)
  )[0];
}

export async function listChipsForPet(db: Db, petId: string): Promise<Microchip[]> {
  return db.select().from(microchips).where(eq(microchips.petId, petId)).orderBy(asc(microchips.createdAt));
}

// --- Pet photos (gallery) ----------------------------------------------------

export async function addPetPhoto(
  db: Db,
  params: { id: string; petId: string; storageKey: string; now: number },
): Promise<void> {
  await db.insert(petPhotos).values({
    id: params.id,
    petId: params.petId,
    storageKey: params.storageKey,
    createdAt: params.now,
  });
}

export async function listPetPhotos(db: Db, petId: string): Promise<PetPhoto[]> {
  return db
    .select()
    .from(petPhotos)
    .where(eq(petPhotos.petId, petId))
    .orderBy(asc(petPhotos.createdAt));
}

// --- Emergency contacts ------------------------------------------------------

export async function createContact(
  db: Db,
  params: { id: string; petId: string; label?: string | null; pii: EnvelopeField; now: number },
): Promise<void> {
  await db.insert(emergencyContacts).values({
    id: params.id,
    petId: params.petId,
    label: params.label ?? null,
    ...toEnvelopeColumns(params.pii),
    createdAt: params.now,
    updatedAt: params.now,
  });
}

export async function listContactsForPet(db: Db, petId: string): Promise<EmergencyContact[]> {
  return db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.petId, petId))
    .orderBy(asc(emergencyContacts.createdAt));
}

export async function getContactById(db: Db, id: string): Promise<EmergencyContact | undefined> {
  return (await db.select().from(emergencyContacts).where(eq(emergencyContacts.id, id)).limit(1))[0];
}

/** Count of active (non-archived) contacts — used to enforce the "keep ≥1" rule. */
export async function countActiveContactsForPet(db: Db, petId: string): Promise<number> {
  const rows = await db
    .select({ c: count() })
    .from(emergencyContacts)
    .where(and(eq(emergencyContacts.petId, petId), isNull(emergencyContacts.archivedAt)));
  return rows[0]?.c ?? 0;
}

export async function updateContact(
  db: Db,
  id: string,
  fields: { label?: string | null; pii: EnvelopeField },
  now: number,
): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ label: fields.label ?? null, ...toEnvelopeColumns(fields.pii), updatedAt: now })
    .where(eq(emergencyContacts.id, id));
}

export async function setContactArchived(
  db: Db,
  id: string,
  archivedAt: number | null,
  now: number,
): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ archivedAt, updatedAt: now })
    .where(eq(emergencyContacts.id, id));
}

export async function deleteContact(db: Db, id: string): Promise<void> {
  // Hard delete removes the ciphertext + wrapped DEK, crypto-shredding the PII.
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
}

// --- Lost mode ---------------------------------------------------------------

export async function getLostMode(db: Db, petId: string): Promise<LostModeStatus | undefined> {
  return (
    await db.select().from(lostModeStatus).where(eq(lostModeStatus.petId, petId)).limit(1)
  )[0];
}

export async function upsertLostMode(
  db: Db,
  params: {
    id: string;
    petId: string;
    isLost: boolean;
    lostSince?: number | null;
    foundAt?: number | null;
    lastSeenLocation?: string | null;
    reward?: string | null;
    publicMessage?: string | null;
    updatedBy?: string | null;
    now: number;
  },
): Promise<void> {
  await db
    .insert(lostModeStatus)
    .values({
      id: params.id,
      petId: params.petId,
      isLost: params.isLost,
      lostSince: params.lostSince ?? null,
      foundAt: params.foundAt ?? null,
      lastSeenLocation: params.lastSeenLocation ?? null,
      reward: params.reward ?? null,
      publicMessage: params.publicMessage ?? null,
      updatedBy: params.updatedBy ?? null,
      createdAt: params.now,
      updatedAt: params.now,
    })
    .onConflictDoUpdate({
      target: lostModeStatus.petId,
      set: {
        isLost: params.isLost,
        lostSince: params.lostSince ?? null,
        foundAt: params.foundAt ?? null,
        lastSeenLocation: params.lastSeenLocation ?? null,
        reward: params.reward ?? null,
        publicMessage: params.publicMessage ?? null,
        updatedBy: params.updatedBy ?? null,
        updatedAt: params.now,
      },
    });
}
