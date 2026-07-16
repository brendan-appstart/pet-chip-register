import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { createTestOwner } from '../helpers/factory';
import { registerPet } from '@/services/pets';
import { lookupChip } from '@/services/lookup';
import { NEUTRAL_LOOKUP_ACK } from '@/domain/lookup/policy';

let env: TestEnv;
const CHIP = '985141000000001';

beforeAll(async () => {
  env = await setupTestDatabase();
  const owner = await createTestOwner(env.db, 'finder-test@example.org');
  const res = await registerPet({ ownerId: owner.id, name: 'Milo', species: 'Dog', chipNumber: CHIP });
  expect(res.ok).toBe(true);
});

afterAll(() => env.cleanup());

describe('secure chip lookup', () => {
  it('notifies the owner on a match and returns only a neutral ack', async () => {
    const ack = await lookupChip({
      chipNumber: CHIP,
      finder: { finderName: 'Sam', contact: 'sam@example.org', message: 'Found near the park!' },
      ipHash: 'ip-match',
    });

    expect(ack.acknowledged).toBe(true);
    expect(ack.message).toBe(NEUTRAL_LOOKUP_ACK);
    // No pet/owner data leaks into the acknowledgement.
    expect(JSON.stringify(ack)).not.toContain('Milo');
    expect(JSON.stringify(ack)).not.toContain('finder-test@example.org');

    const outbox = env.readOutbox();
    const alert = outbox.find((m) => m.to === 'finder-test@example.org');
    expect(alert).toBeDefined();
    expect(alert?.text).toContain('Milo');
    // The finder's relayed message reaches the owner...
    expect(alert?.text).toContain('Found near the park!');
    // ...but the owner's own address is never echoed back to the finder path.
    expect(alert?.text).toContain('were NOT shared with the finder');
  });

  it('returns an identical ack for a non-existent chip and sends no email', async () => {
    const before = env.readOutbox().length;
    const ack = await lookupChip({ chipNumber: '111111111111111', ipHash: 'ip-nomatch' });
    expect(ack.acknowledged).toBe(true);
    expect(ack.message).toBe(NEUTRAL_LOOKUP_ACK);
    expect(env.readOutbox().length).toBe(before); // no notification for a non-match
  });

  it('gives input-format feedback without revealing registration', async () => {
    const ack = await lookupChip({ chipNumber: 'abc', ipHash: 'ip-bad' });
    expect(ack.acknowledged).toBe(false);
    expect(ack.message).toMatch(/microchip number/i);
  });

  it('rate-limits repeated lookups of the same chip from one source', async () => {
    let limited = false;
    for (let i = 0; i < 12; i++) {
      const ack = await lookupChip({ chipNumber: CHIP, ipHash: 'ip-flood' });
      if (ack.retryAfterSeconds !== undefined) limited = true;
    }
    expect(limited).toBe(true);
  });
});
