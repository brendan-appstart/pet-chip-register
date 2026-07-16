import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { getDb, resetDbSingleton, type Db } from '@/db/client';
import { resetConfigCache } from '@/config/env';
import { resetCryptoCache } from '@/crypto';
import { resetProviderCache } from '@/providers';

export interface TestEnv {
  db: Db;
  outboxPath: string;
  dir: string;
  /** Every message written to the dev email outbox so far. */
  readOutbox(): OutboxMessage[];
  cleanup(): void;
}

export interface OutboxMessage {
  id: string;
  to: string;
  subject: string;
  text: string;
}

/**
 * Spin up a fresh, migrated libSQL database in a temp dir and point all cached
 * singletons at it, plus an isolated email outbox. Call in `beforeAll`.
 */
export async function setupTestDatabase(): Promise<TestEnv> {
  const dir = mkdtempSync(join(tmpdir(), 'opr-test-'));
  const outboxPath = join(dir, 'outbox.jsonl');

  process.env.DATABASE_URL = `file:${join(dir, 'test.db')}`;
  process.env.EMAIL_PROVIDER = 'console';
  process.env.EMAIL_DEV_OUTBOX = outboxPath;

  resetConfigCache();
  resetCryptoCache();
  resetProviderCache();
  resetDbSingleton();

  const db = getDb();
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  return {
    db,
    outboxPath,
    dir,
    readOutbox() {
      if (!existsSync(outboxPath)) return [];
      return readFileSync(outboxPath, 'utf8')
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => JSON.parse(l) as OutboxMessage);
    },
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
