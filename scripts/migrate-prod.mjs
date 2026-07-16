// Dependency-light migrator for production/container use. Applies the checked-in
// Drizzle SQL migrations using only @libsql/client (already present in the
// standalone build) + node:fs — avoiding the Drizzle migrator, which Next's
// bundler cannot process. Tracks applied files in `_opr_applied`.
//
// Run with plain node:  node scripts/migrate-prod.mjs
import { createClient } from '@libsql/client';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.env.OPR_MIGRATIONS_DIR ?? './src/db/migrations';
const url = process.env.DATABASE_URL ?? 'file:./var/registry.db';

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await client.execute(
  'CREATE TABLE IF NOT EXISTS _opr_applied (tag TEXT PRIMARY KEY, applied_at INTEGER)',
);
const appliedRows = await client.execute('SELECT tag FROM _opr_applied');
const applied = new Set(appliedRows.rows.map((r) => String(r.tag)));

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

let count = 0;
for (const file of files) {
  const tag = file.replace(/\.sql$/, '');
  if (applied.has(tag)) continue;
  const sql = readFileSync(join(dir, file), 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  await client.execute({
    sql: 'INSERT INTO _opr_applied (tag, applied_at) VALUES (?, ?)',
    args: [tag, Date.now()],
  });
  console.log(`✓ applied ${tag}`);
  count += 1;
}
console.log(count === 0 ? '✓ database already up to date' : `✓ applied ${count} migration(s)`);
