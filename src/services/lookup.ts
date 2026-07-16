import { randomInt } from 'node:crypto';
import { getRateLimiter } from '@/providers';
import { getChipIndex, getEnvelopeCipher, sealJson } from '@/crypto';
import { getDb } from '@/db/client';
import { createLookupEvent } from '@/db/repositories/lookups';
import { findChipByHash } from '@/db/repositories/pets';
import { appendAudit } from '@/db/repositories/audit';
import { parseChip } from '@/domain/pets/chip';
import { neutralAck, rateLimitedAck, type LookupAck } from '@/domain/lookup/policy';
import { finderRelayAad, type FinderRelay } from '@/domain/shared/pii';
import { newId } from '@/lib/ids';
import { systemClock, type Clock } from '@/lib/clock';
import { notifyOwnersOfContact } from './notify';

export interface LookupInput {
  chipNumber: string;
  finder?: FinderRelay;
  ipHash?: string | null;
  fingerprint?: string | null;
}

// Per-IP and per-chip windows resist both broad scanning and repeated probing of
// one guessable chip (the known SaveThisLife prefixes 991 / 900164 are exactly
// this attack). Tune conservatively; legitimate finders search a chip once.
const PER_IP = { limit: 8, windowMs: 60_000 };
const PER_CHIP = { limit: 5, windowMs: 60 * 60_000 };

function hasFinderInfo(f?: FinderRelay): f is FinderRelay {
  return Boolean(f && (f.finderName || f.contact || f.message || f.foundLocation));
}

/**
 * Look up a microchip number. The finder learns NOTHING about registration or
 * ownership — match and no-match return the same acknowledgement (with a small
 * random delay to blunt timing analysis). Only the owner is notified.
 */
export async function lookupChip(
  input: LookupInput,
  clock: Clock = systemClock,
): Promise<LookupAck> {
  const db = getDb();
  const now = clock.now();

  // Level the request timing regardless of the branch taken below.
  await sleep(randomInt(40, 120));

  const chip = parseChip(input.chipNumber);
  if (!chip) {
    // Input-format feedback reveals nothing about registration.
    return {
      acknowledged: false,
      message: "That doesn't look like a microchip number. They're usually 9–15 digits.",
    };
  }

  const chipHash = getChipIndex().compute(chip.normalized);
  const limiter = getRateLimiter();
  const perIp = await limiter.consume(`lookup:ip:${input.ipHash ?? 'unknown'}`, PER_IP);
  const perChip = await limiter.consume(`lookup:chip:${chipHash}`, PER_CHIP);
  if (!perIp.allowed || !perChip.allowed) {
    const retryMs = Math.max(perIp.retryAfterMs, perChip.retryAfterMs);
    await recordEvent(db, { chipHash, outcome: 'rate_limited', input, now });
    return rateLimitedAck(Math.ceil(retryMs / 1000));
  }

  const chipRow = await findChipByHash(db, chipHash);
  const eventId = newId();

  // Encrypt any finder-provided relay data at rest (finder PII is never stored
  // in plaintext, and is only ever relayed to the owner).
  let finderEnvelope = null;
  if (hasFinderInfo(input.finder)) {
    finderEnvelope = await sealJson(getEnvelopeCipher(), input.finder, finderRelayAad(eventId));
  }

  await createLookupEvent(db, {
    id: eventId,
    chipNumberHash: chipHash,
    matchedPetId: chipRow?.petId ?? null,
    outcome: chipRow ? 'matched' : 'no_match',
    finder: finderEnvelope,
    requestIpHash: input.ipHash ?? null,
    requestFingerprint: input.fingerprint ?? null,
    now,
  });

  await appendAudit(db, {
    actorType: 'finder',
    action: 'CHIP_LOOKUP',
    entityType: chipRow ? 'pet' : 'chip',
    entityId: chipRow?.petId ?? null,
    ipHash: input.ipHash ?? null,
    occurredAt: now,
    metadata: { outcome: chipRow ? 'matched' : 'no_match' },
  });

  if (chipRow) {
    await notifyOwnersOfContact({
      petId: chipRow.petId,
      finder: hasFinderInfo(input.finder) ? input.finder : {},
      via: 'chip_lookup',
      now,
      ipHash: input.ipHash ?? null,
    });
  }

  // Identical acknowledgement whether or not a match occurred.
  return neutralAck();
}

async function recordEvent(
  db: ReturnType<typeof getDb>,
  params: {
    chipHash: string;
    outcome: 'rate_limited';
    input: LookupInput;
    now: number;
  },
): Promise<void> {
  await createLookupEvent(db, {
    id: newId(),
    chipNumberHash: params.chipHash,
    outcome: params.outcome,
    requestIpHash: params.input.ipHash ?? null,
    requestFingerprint: params.input.fingerprint ?? null,
    now: params.now,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
