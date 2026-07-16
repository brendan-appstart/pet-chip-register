import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { createTestOwner } from '../helpers/factory';
import { registerPet } from '@/services/pets';
import { verifyAuditChain } from '@/db/repositories/audit';
import { auditLog } from '@/db/schema';

let env: TestEnv;

beforeAll(async () => {
  env = await setupTestDatabase();
  const owner = await createTestOwner(env.db);
  await registerPet({ ownerId: owner.id, name: 'Chip', species: 'Dog', chipNumber: '985141000001234' });
  await registerPet({ ownerId: owner.id, name: 'Dale', species: 'Dog' });
});
afterAll(() => env.cleanup());

describe('tamper-evident audit log', () => {
  it('verifies an intact hash chain', async () => {
    const res = await verifyAuditChain(env.db);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.count).toBeGreaterThan(0);
  });

  it('detects tampering with a historical row', async () => {
    const first = (await env.db.select().from(auditLog).orderBy(asc(auditLog.id)).limit(1))[0]!;
    await env.db.update(auditLog).set({ action: 'TAMPERED' }).where(eq(auditLog.id, first.id));
    const res = await verifyAuditChain(env.db);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.brokenAt).toBe(first.id);
  });
});
