'use server';

import { redirect } from 'next/navigation';
import {
  addChipToPet,
  addEmergencyContact,
  addPetPhotos,
  archiveEmergencyContact,
  deleteEmergencyContact,
  registerPet,
  unarchiveEmergencyContact,
  updateEmergencyContact,
  updatePetDetails,
} from '@/services/pets';
import { setLostMode } from '@/services/lostMode';
import { updateOwnerProfile } from '@/services/account';
import { requireOwner, getRequestContext } from '../_lib/session';

function str(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? undefined : s;
}

export async function registerPetAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const res = await registerPet({
    ownerId: owner.id,
    name: String(formData.get('name') ?? '').trim(),
    species: String(formData.get('species') ?? '').trim(),
    breed: str(formData.get('breed')),
    color: str(formData.get('color')),
    sex: str(formData.get('sex')),
    description: str(formData.get('description')),
    chipNumber: str(formData.get('chipNumber')),
    ...ctx,
  });
  if (!res.ok) redirect(`/owner/pets/new?error=${res.error}`);
  redirect(`/owner/pets/${res.value.petId}?status=created`);
}

export async function updatePetAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await updatePetDetails({
    ownerId: owner.id,
    petId,
    fields: {
      name: String(formData.get('name') ?? '').trim(),
      species: String(formData.get('species') ?? '').trim(),
      breed: str(formData.get('breed')) ?? null,
      color: str(formData.get('color')) ?? null,
      sex: str(formData.get('sex')) ?? null,
      description: str(formData.get('description')) ?? null,
    },
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'updated' : res.error}`);
}

export async function addChipAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await addChipToPet({
    ownerId: owner.id,
    petId,
    chipNumber: String(formData.get('chipNumber') ?? ''),
    brand: str(formData.get('brand')),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'chip_added' : res.error}`);
}

export async function addContactAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await addEmergencyContact({
    ownerId: owner.id,
    petId,
    label: str(formData.get('label')),
    name: String(formData.get('name') ?? '').trim(),
    phone: str(formData.get('phone')),
    email: str(formData.get('email')),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'contact_added' : res.error}`);
}

export async function editContactAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await updateEmergencyContact({
    ownerId: owner.id,
    petId,
    contactId: String(formData.get('contactId') ?? ''),
    label: str(formData.get('label')),
    name: String(formData.get('name') ?? '').trim(),
    phone: str(formData.get('phone')),
    email: str(formData.get('email')),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'contact_updated' : res.error}`);
}

export async function archiveContactAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await archiveEmergencyContact({
    ownerId: owner.id,
    petId,
    contactId: String(formData.get('contactId') ?? ''),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'contact_archived' : res.error}`);
}

export async function unarchiveContactAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await unarchiveEmergencyContact({
    ownerId: owner.id,
    petId,
    contactId: String(formData.get('contactId') ?? ''),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'contact_unarchived' : res.error}`);
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const res = await deleteEmergencyContact({
    ownerId: owner.id,
    petId,
    contactId: String(formData.get('contactId') ?? ''),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${res.ok ? 'contact_deleted' : res.error}`);
}

export async function setLostModeAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');
  const isLost = String(formData.get('isLost') ?? '') === 'true';
  await setLostMode({
    ownerId: owner.id,
    petId,
    isLost,
    lastSeenLocation: str(formData.get('lastSeenLocation')),
    reward: str(formData.get('reward')),
    publicMessage: str(formData.get('publicMessage')),
    ...ctx,
  });
  redirect(`/owner/pets/${petId}?status=${isLost ? 'lost_on' : 'lost_off'}`);
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS_PER_UPLOAD = 8;

export async function uploadPhotoAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const ctx = await getRequestContext();
  const petId = String(formData.get('petId') ?? '');

  const files = formData
    .getAll('photos')
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS_PER_UPLOAD);

  if (files.some((f) => f.size > MAX_PHOTO_BYTES)) {
    redirect(`/owner/pets/${petId}?status=photo_too_large`);
  }
  if (files.length === 0) redirect(`/owner/pets/${petId}?status=photo`);

  const images = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
  await addPetPhotos({ ownerId: owner.id, petId, images, ...ctx });
  redirect(`/owner/pets/${petId}?status=photo`);
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  await updateOwnerProfile({
    ownerId: owner.id,
    displayName: str(formData.get('displayName')),
    phone: str(formData.get('phone')),
    address: str(formData.get('address')),
  });
  redirect('/owner?status=profile');
}
