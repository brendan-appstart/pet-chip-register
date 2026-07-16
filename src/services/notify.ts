import { getConfig } from '@/config/env';
import { getEmailProvider } from '@/providers';
import { getEnvelopeCipher, openJson } from '@/crypto';
import { getDb } from '@/db/client';
import { getOwnerById } from '@/db/repositories/auth';
import { getPetById, listOwnerIdsForPet } from '@/db/repositories/pets';
import { createNotification } from '@/db/repositories/lookups';
import { fromEnvelopeColumns } from '@/db/repositories/envelope';
import { appendAudit } from '@/db/repositories/audit';
import { ownerPiiAad, type FinderRelay, type OwnerPii } from '@/domain/shared/pii';
import { newId } from '@/lib/ids';

/**
 * Notify every owner linked to a pet that someone made contact (a chip lookup or
 * a found-report from the public page). The relay is strictly one-directional:
 * the owner receives the finder's optional message/contact; the finder never
 * receives owner information. Owner email is decrypted only here, and the
 * decryption is audited.
 */
export async function notifyOwnersOfContact(params: {
  petId: string;
  finder: FinderRelay;
  via: 'chip_lookup' | 'public_page';
  now: number;
  ipHash?: string | null;
}): Promise<{ notified: number }> {
  const db = getDb();
  const cipher = getEnvelopeCipher();
  const pet = await getPetById(db, params.petId);
  if (!pet) return { notified: 0 };

  const ownerIds = await listOwnerIdsForPet(db, params.petId);
  let notified = 0;

  for (const ownerId of ownerIds) {
    const owner = await getOwnerById(db, ownerId);
    if (!owner || owner.status !== 'active') continue;

    const notifId = newId();
    let email: string;
    try {
      const pii = await openJson<OwnerPii>(cipher, fromEnvelopeColumns(owner), ownerPiiAad(owner.id));
      email = pii.email;
      await appendAudit(db, {
        actorType: 'system',
        action: 'PII_DECRYPT',
        entityType: 'owner',
        entityId: owner.id,
        occurredAt: params.now,
        metadata: { reason: 'notify_owner' },
      });
    } catch {
      await createNotification(db, {
        id: notifId,
        ownerId,
        petId: params.petId,
        channel: 'email',
        type: 'chip_lookup_alert',
        status: 'failed',
        error: 'pii_decrypt_failed',
        now: params.now,
      });
      continue;
    }

    const { subject, text } = composeFoundEmail({
      petName: pet.name,
      finder: params.finder,
      via: params.via,
      portalUrl: `${getConfig().appUrl}/owner/pets/${pet.id}`,
    });

    try {
      const res = await getEmailProvider().send({ to: email, subject, text });
      await createNotification(db, {
        id: notifId,
        ownerId,
        petId: params.petId,
        channel: 'email',
        type: 'chip_lookup_alert',
        status: 'sent',
        provider: res.provider,
        providerMessageId: res.id,
        now: params.now,
      });
      notified += 1;
    } catch (e) {
      await createNotification(db, {
        id: notifId,
        ownerId,
        petId: params.petId,
        channel: 'email',
        type: 'chip_lookup_alert',
        status: 'failed',
        error: e instanceof Error ? e.message : 'send_failed',
        now: params.now,
      });
    }

    await appendAudit(db, {
      actorType: 'system',
      action: 'NOTIFY_OWNER',
      entityType: 'pet',
      entityId: params.petId,
      ipHash: params.ipHash ?? null,
      occurredAt: params.now,
      metadata: { via: params.via },
    });
  }

  return { notified };
}

// Plain-text email (no HTML → no injection surface from finder-supplied text).
function composeFoundEmail(params: {
  petName: string;
  finder: FinderRelay;
  via: 'chip_lookup' | 'public_page';
  portalUrl: string;
}): { subject: string; text: string } {
  const lines: string[] = [];
  lines.push(`Good news — someone may have found ${params.petName}.`);
  lines.push('');
  lines.push(
    params.via === 'chip_lookup'
      ? `Someone searched ${params.petName}'s microchip number in the registry.`
      : `Someone opened ${params.petName}'s registry page and reached out.`,
  );
  lines.push('');
  if (params.finder.message) {
    lines.push('Their message:');
    lines.push(`  ${params.finder.message}`);
    lines.push('');
  }
  const contactBits: string[] = [];
  if (params.finder.finderName) contactBits.push(`Name: ${params.finder.finderName}`);
  if (params.finder.contact) contactBits.push(`Contact: ${params.finder.contact}`);
  if (params.finder.foundLocation) contactBits.push(`Found near: ${params.finder.foundLocation}`);
  if (contactBits.length > 0) {
    lines.push('How to reach them:');
    for (const bit of contactBits) lines.push(`  ${bit}`);
    lines.push('');
  }
  lines.push(`Manage ${params.petName} in your account:`);
  lines.push(`  ${params.portalUrl}`);
  lines.push('');
  lines.push('Your contact details were NOT shared with the finder.');
  return { subject: `Someone may have found ${params.petName}`, text: lines.join('\n') };
}
