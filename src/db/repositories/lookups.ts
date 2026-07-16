import { eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { lookupEvents, notifications } from '@/db/schema';
import type { LookupEvent } from '@/db/schema';
import type { EnvelopeField } from '@/crypto';
import { fromNullableEnvelopeColumns } from './envelope';

// --- Lookup events -----------------------------------------------------------

export async function createLookupEvent(
  db: Db,
  params: {
    id: string;
    chipNumberHash: string;
    matchedPetId?: string | null;
    outcome: 'matched' | 'no_match' | 'rate_limited' | 'challenged';
    finder?: EnvelopeField | null;
    requestIpHash?: string | null;
    requestFingerprint?: string | null;
    now: number;
  },
): Promise<void> {
  const f = params.finder;
  await db.insert(lookupEvents).values({
    id: params.id,
    chipNumberHash: params.chipNumberHash,
    matchedPetId: params.matchedPetId ?? null,
    outcome: params.outcome,
    ciphertext: f?.ciphertext ?? null,
    nonce: f?.nonce ?? null,
    wrappedDek: f?.wrappedDek ?? null,
    kekId: f?.kekId ?? null,
    alg: f?.alg ?? null,
    requestIpHash: params.requestIpHash ?? null,
    requestFingerprint: params.requestFingerprint ?? null,
    createdAt: params.now,
  });
}

export function finderRelayEnvelope(event: LookupEvent): EnvelopeField | null {
  return fromNullableEnvelopeColumns(event);
}

// --- Notifications -----------------------------------------------------------

export async function createNotification(
  db: Db,
  params: {
    id: string;
    ownerId: string;
    petId?: string | null;
    channel: 'email' | 'sms' | 'push';
    type: 'chip_lookup_alert' | 'magic_link' | 'lost_mode_ack';
    status?: 'pending' | 'sent' | 'failed';
    provider?: string | null;
    providerMessageId?: string | null;
    error?: string | null;
    now: number;
  },
): Promise<void> {
  await db.insert(notifications).values({
    id: params.id,
    ownerId: params.ownerId,
    petId: params.petId ?? null,
    channel: params.channel,
    type: params.type,
    status: params.status ?? 'pending',
    provider: params.provider ?? null,
    providerMessageId: params.providerMessageId ?? null,
    error: params.error ?? null,
    createdAt: params.now,
    updatedAt: params.now,
  });
}

export async function updateNotificationStatus(
  db: Db,
  id: string,
  fields: {
    status: 'pending' | 'sent' | 'failed';
    provider?: string | null;
    providerMessageId?: string | null;
    error?: string | null;
  },
  now: number,
): Promise<void> {
  await db
    .update(notifications)
    .set({
      status: fields.status,
      provider: fields.provider ?? null,
      providerMessageId: fields.providerMessageId ?? null,
      error: fields.error ?? null,
      updatedAt: now,
    })
    .where(eq(notifications.id, id));
}
