# 0001 — Database: Turso/libSQL + Drizzle

**Status:** Accepted

## Context

The registry must survive for decades with no vendor lock-in, be trivial to run locally, and
allow a future move to another SQL database. The charter names Turso as the preferred initial
choice for its replication, SQLite compatibility, and offline resilience.

## Decision

Use **libSQL/SQLite** via **Turso** for the database, accessed through **Drizzle ORM**.
Enforce portability conventions so a Postgres swap stays mechanical: text ULID primary keys,
integer epoch-millisecond timestamps, `blob` ciphertext, integer 0/1 booleans, and **no
SQLite-only functions in application queries** (JSON is (de)serialized in app code).
Repositories isolate all queries behind functions.

## Consequences

- Local dev is a single file (`file:./local.db`); production can be Turso or self-hosted
  libSQL. Migrations are generated SQL, checked into git, reproducible anywhere.
- Swapping to Postgres means changing the Drizzle dialect and re-generating migrations; the
  repository interfaces and portable SQL keep the blast radius small.
- We forgo some Postgres-specific features (rich JSON querying, row-level security) to keep
  the data layer portable.
