import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { auditChainHead, auditLog } from '@/db/schema';
import { canonicalJson } from '@/lib/canonicalJson';
import { newId } from '@/lib/ids';
import { sha256Hex } from '@/security/hash';

/**
 * Append-only, tamper-evident audit log. Each row commits the hash of the
 * previous row, forming a chain: altering or deleting any historical row breaks
 * every subsequent hash. A single-row "chain head" table pins the tip so the
 * chain is extended safely and can be verified from a known anchor.
 */
const GENESIS = 'GENESIS';

export interface AuditEntry {
  actorType: 'owner' | 'finder' | 'system' | 'admin';
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipHash?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: number;
}

function computeRowHash(fields: {
  id: string;
  occurredAt: number;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipHash: string | null;
  metadataJson: string | null;
  prevHash: string;
}): string {
  return sha256Hex(canonicalJson(fields));
}

export async function appendAudit(db: Db, entry: AuditEntry): Promise<void> {
  const metadataJson = entry.metadata ? canonicalJson(entry.metadata) : null;
  await db.transaction(async (tx) => {
    const head = (
      await tx.select().from(auditChainHead).where(eq(auditChainHead.id, 1)).limit(1)
    )[0];
    const prevHash = head?.headHash ?? GENESIS;
    const id = newId();
    const rowHash = computeRowHash({
      id,
      occurredAt: entry.occurredAt,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      ipHash: entry.ipHash ?? null,
      metadataJson,
      prevHash,
    });

    await tx.insert(auditLog).values({
      id,
      occurredAt: entry.occurredAt,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      ipHash: entry.ipHash ?? null,
      metadataJson,
      prevHash,
      rowHash,
    });

    if (head) {
      await tx
        .update(auditChainHead)
        .set({ headHash: rowHash, count: head.count + 1, updatedAt: entry.occurredAt })
        .where(eq(auditChainHead.id, 1));
    } else {
      await tx
        .insert(auditChainHead)
        .values({ id: 1, headHash: rowHash, count: 1, updatedAt: entry.occurredAt });
    }
  });
}

/** Recompute the chain from the genesis anchor; returns the first broken id, if any. */
export async function verifyAuditChain(
  db: Db,
): Promise<{ ok: true; count: number } | { ok: false; brokenAt: string }> {
  const rows = await db.select().from(auditLog).orderBy(asc(auditLog.id));
  let prevHash = GENESIS;
  for (const row of rows) {
    const expected = computeRowHash({
      id: row.id,
      occurredAt: row.occurredAt,
      actorType: row.actorType,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      ipHash: row.ipHash,
      metadataJson: row.metadataJson,
      prevHash,
    });
    if (row.prevHash !== prevHash || row.rowHash !== expected) {
      return { ok: false, brokenAt: row.id };
    }
    prevHash = row.rowHash;
  }
  return { ok: true, count: rows.length };
}
