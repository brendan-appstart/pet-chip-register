import { defineConfig } from 'drizzle-kit';

// Migrations are generated from the Drizzle schema and checked into git so any
// operator can reproduce the database from scratch — a requirement for the
// project's long-term, vendor-independent recoverability.
export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  strict: true,
  verbose: true,
});
