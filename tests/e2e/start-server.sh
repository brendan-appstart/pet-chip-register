#!/usr/bin/env bash
# Boot a Next dev server for Playwright against an isolated e2e database and a
# deterministic set of dev keys (NOT for real use). Seeds demo data first.
set -euo pipefail

PORT="${E2E_PORT:-3100}"
export APP_URL="http://localhost:${PORT}"
export DATABASE_URL="file:./var/e2e.db"
export EMAIL_PROVIDER="console"
export EMAIL_DEV_OUTBOX="./var/e2e-outbox.jsonl"
export OPR_KEK_ACTIVE_ID="e2e"
export OPR_KEK_e2e="$(node -e "process.stdout.write(Buffer.alloc(32,3).toString('base64'))")"
export OPR_INDEX_KEY="$(node -e "process.stdout.write(Buffer.alloc(32,5).toString('base64'))")"

mkdir -p var
rm -f ./var/e2e.db ./var/e2e.db-shm ./var/e2e.db-wal ./var/e2e-outbox.jsonl

npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts

exec npx next dev -p "${PORT}"
