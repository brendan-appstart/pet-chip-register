import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getConfig } from '@/config/env';
import * as schema from './schema/index';

export type Db = LibSQLDatabase<typeof schema>;

/**
 * Raw libSQL client. Foreign-key enforcement is OFF by default in SQLite, so we
 * turn it on per connection; libSQL serializes statements on a connection, so
 * the fire-and-forget PRAGMA runs before any later query.
 */
export function createRawClient(url: string, authToken?: string): Client {
  const client = createClient({ url, authToken });
  void client.execute('PRAGMA foreign_keys = ON;');
  return client;
}

export function createDb(url: string, authToken?: string): Db {
  return drizzle(createRawClient(url, authToken), { schema, logger: false });
}

let singleton: Db | undefined;

export function getDb(): Db {
  if (!singleton) {
    const cfg = getConfig();
    singleton = createDb(cfg.database.url, cfg.database.authToken);
  }
  return singleton;
}

/** Test helper. */
export function resetDbSingleton(): void {
  singleton = undefined;
}

export { schema };
