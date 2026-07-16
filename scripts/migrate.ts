import { loadEnv } from './loadEnv';

loadEnv();

const { migrate } = await import('drizzle-orm/libsql/migrator');
const { createDb } = await import('@/db/client');
const { getConfig } = await import('@/config/env');

const cfg = getConfig();
const db = createDb(cfg.database.url, cfg.database.authToken);
await migrate(db, { migrationsFolder: './src/db/migrations' });
console.log(`✓ Migrations applied to ${cfg.database.url}`);
process.exit(0);
