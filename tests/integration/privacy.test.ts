import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { createTestOwner } from '../helpers/factory';
import { getOwnerPetDetail, registerPet } from '@/services/pets';
import { microchips, owners } from '@/db/schema';

let env: TestEnv;
const EMAIL = 'privacy@example.org';
const CHIP = '985141000009999';
let ownerId: string;
let petId: string;

beforeAll(async () => {
  env = await setupTestDatabase();
  const owner = await createTestOwner(env.db, EMAIL);
  ownerId = owner.id;
  const res = await registerPet({ ownerId, name: 'Rex', species: 'Dog', chipNumber: CHIP });
  if (!res.ok) throw new Error('registerPet failed');
  petId = res.value.petId;
});
afterAll(() => env.cleanup());

describe('at-rest privacy', () => {
  it('stores owner email only as ciphertext + a hash, never plaintext', async () => {
    const row = (await env.db.select().from(owners).where(eq(owners.id, ownerId)))[0]!;
    expect(row.emailLookupHash).not.toBe(EMAIL);
    expect(row.emailLookupHash).toMatch(/^[0-9a-f]{64}$/); // HMAC hex
    expect(row.ciphertext.length).toBeGreaterThan(0);
    // The plaintext email appears in NO column of the row.
    expect(JSON.stringify(row)).not.toContain(EMAIL);
  });

  it('stores the chip number only as a hash + ciphertext, keeping just last-4 for UI', async () => {
    const chip = (await env.db.select().from(microchips).where(eq(microchips.petId, petId)))[0]!;
    expect(chip.chipNumberHash).not.toContain(CHIP);
    expect(chip.chipNumberHash).toMatch(/^[0-9a-f]{64}$/);
    expect(chip.chipLast4).toBe('9999');
    expect(JSON.stringify(chip)).not.toContain(CHIP);
  });

  it('round-trips the decrypted values back to the owner', async () => {
    const detail = await getOwnerPetDetail(ownerId, petId);
    expect(detail).not.toBeNull();
    expect(detail!.chips[0]?.number).toBe(CHIP);
  });
});
