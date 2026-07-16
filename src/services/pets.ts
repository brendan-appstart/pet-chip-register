import { getDb } from '@/db/client';
import type { Pet } from '@/db/schema';
import { getStorage } from '@/providers';
import { getChipIndex, getEnvelopeCipher, openJson, sealJson } from '@/crypto';
import {
  addPetPhoto,
  createChip,
  createContact,
  createPet,
  findChipByHash,
  getLostMode,
  getPetById,
  isOwnerOfPet,
  linkOwnerPet,
  listChipsForPet,
  listContactsForPet,
  listPetPhotos,
  listPetsForOwner,
  setPetPhotoKey,
  updatePet,
} from '@/db/repositories/pets';
import { processAndStorePetPhoto } from './photos';
import { appendAudit } from '@/db/repositories/audit';
import { fromEnvelopeColumns } from '@/db/repositories/envelope';
import { chipNumberAad, contactPiiAad, type ContactPii } from '@/domain/shared/pii';
import { chipLast4, parseChip } from '@/domain/pets/chip';
import { newId, newPublicToken } from '@/lib/ids';
import { systemClock, type Clock } from '@/lib/clock';
import { err, ok, type Result } from '@/lib/result';
import type { RequestContext } from './auth';

export interface RegisterPetInput extends RequestContext {
  ownerId: string;
  name: string;
  species: string;
  breed?: string;
  color?: string;
  sex?: string;
  description?: string;
  chipNumber?: string;
}

export async function registerPet(
  input: RegisterPetInput,
  clock: Clock = systemClock,
): Promise<Result<{ petId: string; publicToken: string }, 'invalid_chip' | 'chip_taken'>> {
  const db = getDb();
  const now = clock.now();

  // Validate the chip (if any) BEFORE creating the pet, so a bad chip doesn't
  // leave an orphaned pet.
  let chip: ReturnType<typeof parseChip> = null;
  let chipHash: string | undefined;
  if (input.chipNumber && input.chipNumber.trim() !== '') {
    chip = parseChip(input.chipNumber);
    if (!chip) return err('invalid_chip');
    chipHash = getChipIndex().compute(chip.normalized);
    if (await findChipByHash(db, chipHash)) return err('chip_taken');
  }

  const petId = newId();
  const publicToken = newPublicToken();
  await createPet(db, {
    id: petId,
    publicToken,
    name: input.name.trim(),
    species: input.species.trim(),
    breed: input.breed?.trim() || null,
    color: input.color?.trim() || null,
    sex: input.sex?.trim() || null,
    description: input.description?.trim() || null,
    primaryOwnerId: input.ownerId,
    now,
  });
  await linkOwnerPet(db, { id: newId(), ownerId: input.ownerId, petId, role: 'owner', now });

  if (chip && chipHash) {
    const chipId = newId();
    const sealed = await sealJson(getEnvelopeCipher(), { number: chip.normalized }, chipNumberAad(chipId));
    await createChip(db, {
      id: chipId,
      petId,
      chipNumberHash: chipHash,
      chipLast4: chip.last4,
      chip: sealed,
      now,
    });
  }

  await appendAudit(db, {
    actorType: 'owner',
    actorId: input.ownerId,
    action: 'PET_REGISTER',
    entityType: 'pet',
    entityId: petId,
    ipHash: input.ipHash ?? null,
    metadata: { hasChip: Boolean(chip) },
    occurredAt: now,
  });

  return ok({ petId, publicToken });
}

export async function addChipToPet(
  input: { ownerId: string; petId: string; chipNumber: string; brand?: string } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ chipId: string }, 'forbidden' | 'invalid_chip' | 'chip_taken'>> {
  const db = getDb();
  const now = clock.now();
  if (!(await isOwnerOfPet(db, input.ownerId, input.petId))) return err('forbidden');

  const chip = parseChip(input.chipNumber);
  if (!chip) return err('invalid_chip');
  const chipHash = getChipIndex().compute(chip.normalized);
  if (await findChipByHash(db, chipHash)) return err('chip_taken');

  const chipId = newId();
  const sealed = await sealJson(getEnvelopeCipher(), { number: chip.normalized }, chipNumberAad(chipId));
  await createChip(db, {
    id: chipId,
    petId: input.petId,
    chipNumberHash: chipHash,
    chipLast4: chip.last4,
    chip: sealed,
    brand: input.brand?.trim() || null,
    now,
  });

  await appendAudit(db, {
    actorType: 'owner',
    actorId: input.ownerId,
    action: 'CHIP_ADD',
    entityType: 'pet',
    entityId: input.petId,
    ipHash: input.ipHash ?? null,
    occurredAt: now,
  });
  return ok({ chipId });
}

export async function addEmergencyContact(
  input: {
    ownerId: string;
    petId: string;
    label?: string;
    name: string;
    phone?: string;
    email?: string;
  } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ contactId: string }, 'forbidden'>> {
  const db = getDb();
  const now = clock.now();
  if (!(await isOwnerOfPet(db, input.ownerId, input.petId))) return err('forbidden');

  const contactId = newId();
  const pii: ContactPii = {
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
  };
  const sealed = await sealJson(getEnvelopeCipher(), pii, contactPiiAad(contactId));
  await createContact(db, {
    id: contactId,
    petId: input.petId,
    label: input.label?.trim() || null,
    pii: sealed,
    now,
  });
  return ok({ contactId });
}

export async function updatePetDetails(
  input: {
    ownerId: string;
    petId: string;
    fields: Partial<Pick<Pet, 'name' | 'species' | 'breed' | 'color' | 'sex' | 'description'>>;
  } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ updated: true }, 'forbidden'>> {
  const db = getDb();
  const now = clock.now();
  if (!(await isOwnerOfPet(db, input.ownerId, input.petId))) return err('forbidden');
  await updatePet(db, input.petId, input.fields, now);
  return ok({ updated: true });
}

/**
 * Add one or more photos to a pet's gallery. Each image is re-encoded (EXIF/GPS
 * stripped) and stored. The first photo also becomes the cover if none is set.
 */
export async function addPetPhotos(
  input: { ownerId: string; petId: string; images: Buffer[] } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ added: number }, 'forbidden'>> {
  const db = getDb();
  const now = clock.now();
  if (!(await isOwnerOfPet(db, input.ownerId, input.petId))) return err('forbidden');

  let added = 0;
  let firstKey: string | undefined;
  for (const image of input.images) {
    const key = await processAndStorePetPhoto(input.petId, image);
    await addPetPhoto(db, { id: newId(), petId: input.petId, storageKey: key, now });
    firstKey ??= key;
    added += 1;
  }

  // Set the cover to the first uploaded photo if the pet has none yet.
  if (firstKey) {
    const pet = await getPetById(db, input.petId);
    if (pet && !pet.photoStorageKey) {
      await setPetPhotoKey(db, input.petId, firstKey, now);
    }
  }
  return ok({ added });
}

// --- Owner-facing (decrypted) views -----------------------------------------

export async function listOwnerPets(ownerId: string): Promise<Pet[]> {
  return listPetsForOwner(getDb(), ownerId);
}

export interface OwnerChipView {
  id: string;
  last4: string;
  brand: string | null;
  number: string;
}
export interface OwnerContactView {
  id: string;
  label: string | null;
  name: string;
  phone?: string;
  email?: string;
}
export interface OwnerPetDetail {
  pet: Pet;
  chips: OwnerChipView[];
  contacts: OwnerContactView[];
  photos: { id: string; url: string }[];
  lostMode: { isLost: boolean; lastSeenLocation: string | null; reward: string | null; publicMessage: string | null } | null;
}

/** Full detail for the owner's own pet, decrypting chips and contacts. */
export async function getOwnerPetDetail(
  ownerId: string,
  petId: string,
): Promise<OwnerPetDetail | null> {
  const db = getDb();
  if (!(await isOwnerOfPet(db, ownerId, petId))) return null;
  const pet = await getPetById(db, petId);
  if (!pet) return null;

  const cipher = getEnvelopeCipher();
  const chipRows = await listChipsForPet(db, petId);
  const chips: OwnerChipView[] = [];
  for (const c of chipRows) {
    const { number } = await openJson<{ number: string }>(
      cipher,
      fromEnvelopeColumns(c),
      chipNumberAad(c.id),
    );
    chips.push({ id: c.id, last4: c.chipLast4 || chipLast4(number), brand: c.brand, number });
  }

  const contactRows = await listContactsForPet(db, petId);
  const contacts: OwnerContactView[] = [];
  for (const c of contactRows) {
    const pii = await openJson<ContactPii>(cipher, fromEnvelopeColumns(c), contactPiiAad(c.id));
    contacts.push({ id: c.id, label: c.label, name: pii.name, phone: pii.phone, email: pii.email });
  }

  const storage = getStorage();
  const photoRows = await listPetPhotos(db, petId);
  const photos = await Promise.all(
    photoRows.map(async (p) => ({ id: p.id, url: await storage.getUrl(p.storageKey) })),
  );

  const lm = await getLostMode(db, petId);
  return {
    pet,
    chips,
    contacts,
    photos,
    lostMode: lm
      ? {
          isLost: lm.isLost,
          lastSeenLocation: lm.lastSeenLocation,
          reward: lm.reward,
          publicMessage: lm.publicMessage,
        }
      : null,
  };
}
