import { getEnvelopeCipher, getEmailIndex, sealJson } from '@/crypto';
import { createOwner } from '@/db/repositories/auth';
import { ownerPiiAad } from '@/domain/shared/pii';
import { newId } from '@/lib/ids';
import type { Db } from '@/db/client';

/** Create an owner row directly (bypasses the magic-link flow) for test setup. */
export async function createTestOwner(
  db: Db,
  email = 'owner@example.org',
): Promise<{ id: string; email: string }> {
  const id = newId();
  const emailHash = getEmailIndex().compute(email);
  const pii = await sealJson(getEnvelopeCipher(), { email }, ownerPiiAad(id));
  await createOwner(db, { id, emailLookupHash: emailHash, pii, now: Date.now() });
  return { id, email };
}
