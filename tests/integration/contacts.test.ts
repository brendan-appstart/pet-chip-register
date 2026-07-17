import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { createTestOwner } from '../helpers/factory';
import {
  addEmergencyContact,
  archiveEmergencyContact,
  deleteEmergencyContact,
  getOwnerPetDetail,
  registerPet,
  unarchiveEmergencyContact,
  updateEmergencyContact,
} from '@/services/pets';
import type { Result } from '@/lib/result';

function must<T>(r: Result<T, unknown>): T {
  if (!r.ok) throw new Error(`expected ok, got error: ${String(r.error)}`);
  return r.value;
}

let env: TestEnv;
let ownerId: string;
let petId: string;

async function activeCount(): Promise<number> {
  const d = await getOwnerPetDetail(ownerId, petId);
  return d!.contacts.filter((c) => !c.archived).length;
}

beforeAll(async () => {
  env = await setupTestDatabase();
  const owner = await createTestOwner(env.db, 'contacts@example.org');
  ownerId = owner.id;
  const pet = must(await registerPet({ ownerId, name: 'Milo', species: 'Dog' }));
  petId = pet.petId;
});
afterAll(() => env.cleanup());

describe('emergency contact edit / archive / delete', () => {
  it('keeps at least one active contact once one is entered', async () => {
    const c1 = must(await addEmergencyContact({ ownerId, petId, name: 'Vet Alice', phone: '555' }));
    expect(await activeCount()).toBe(1);

    // Cannot archive or delete the only contact.
    expect((await archiveEmergencyContact({ ownerId, petId, contactId: c1.contactId })).ok).toBe(false);
    expect((await deleteEmergencyContact({ ownerId, petId, contactId: c1.contactId })).ok).toBe(false);
    expect(await activeCount()).toBe(1);
  });

  it('edits a contact (re-encrypting its PII)', async () => {
    const detail = await getOwnerPetDetail(ownerId, petId);
    const id = detail!.contacts[0]!.id;
    must(
      await updateEmergencyContact({
        ownerId,
        petId,
        contactId: id,
        name: 'Vet Alice Updated',
        phone: '999',
        label: 'Vet',
      }),
    );
    const after = await getOwnerPetDetail(ownerId, petId);
    const c = after!.contacts.find((x) => x.id === id)!;
    expect(c.name).toBe('Vet Alice Updated');
    expect(c.phone).toBe('999');
    expect(c.label).toBe('Vet');
  });

  it('archives, restores, and deletes once a second contact exists', async () => {
    const first = (await getOwnerPetDetail(ownerId, petId))!.contacts[0]!.id;
    const c2 = must(await addEmergencyContact({ ownerId, petId, name: 'Neighbor Bob' }));
    expect(await activeCount()).toBe(2);

    // Archive the first (2 active → allowed).
    must(await archiveEmergencyContact({ ownerId, petId, contactId: first }));
    expect(await activeCount()).toBe(1);
    const archived = (await getOwnerPetDetail(ownerId, petId))!.contacts.find((c) => c.id === first)!;
    expect(archived.archived).toBe(true);

    // The remaining active contact is now the last → cannot delete it.
    expect((await deleteEmergencyContact({ ownerId, petId, contactId: c2.contactId })).ok).toBe(false);

    // An archived contact can always be deleted (doesn't reduce active count).
    must(await deleteEmergencyContact({ ownerId, petId, contactId: first }));
    const remaining = (await getOwnerPetDetail(ownerId, petId))!.contacts;
    expect(remaining.some((c) => c.id === first)).toBe(false);

    // Restore path.
    const c3 = must(await addEmergencyContact({ ownerId, petId, name: 'Sister' }));
    must(await archiveEmergencyContact({ ownerId, petId, contactId: c2.contactId }));
    expect(must(await unarchiveEmergencyContact({ ownerId, petId, contactId: c2.contactId })).unarchived).toBe(true);
    void c3;
  });

  it('rejects editing a contact you do not own', async () => {
    const other = await createTestOwner(env.db, 'intruder@example.org');
    const id = (await getOwnerPetDetail(ownerId, petId))!.contacts[0]!.id;
    const res = await updateEmergencyContact({ ownerId: other.id, petId, contactId: id, name: 'hacked' });
    expect(res.ok).toBe(false);
  });
});
