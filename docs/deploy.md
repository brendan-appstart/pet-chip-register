# Deployment & Operations Guide

The registry is self-hostable first and vendor-neutral. You can run it on any Node host, in
Docker, or on a PaaS. Below are the common paths.

## 0. Generate keys (all deployments)

```bash
node -e "console.log('OPR_KEK_k1='+require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('OPR_INDEX_KEY='+require('crypto').randomBytes(32).toString('base64'))"
```

Store these in your platform's secret store. **Back them up separately from the database.**
See [`KEY-MANAGEMENT.md`](./KEY-MANAGEMENT.md). Losing the KEK makes owner PII unrecoverable.

## 1. Docker / docker-compose (self-host)

```bash
export OPR_KEK_ACTIVE_ID=k1
export OPR_KEK_k1=<base64-32-bytes>
export OPR_INDEX_KEY=<base64-32-bytes>
export APP_URL=https://registry.example.org
# production email:
export EMAIL_PROVIDER=smtp SMTP_HOST=smtp.example.org SMTP_USER=... SMTP_PASSWORD=...
docker compose up --build -d
```

The container applies migrations on startup (`OPR_AUTO_MIGRATE=1`) and persists the libSQL
database in the `registry-data` volume. Put a TLS-terminating reverse proxy (Caddy, nginx,
Traefik) in front and point `APP_URL` at the public HTTPS URL.

## 2. Node host (no Docker)

```bash
npm ci
npm run build
export NODE_ENV=production APP_URL=https://registry.example.org OPR_KEK_ACTIVE_ID=k1 \
       OPR_KEK_k1=... OPR_INDEX_KEY=... DATABASE_URL=file:/var/lib/opr/registry.db
npm run db:migrate
npm start
```

## 3. Turso (hosted libSQL) + any host / Vercel

Create a Turso database and set:

```
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=...
```

Run `npm run db:migrate` once (or let the app auto-migrate). The app also deploys to Vercel:
push the repo, set the env vars above plus the keys, and deploy. Because storage defaults to
the local filesystem, configure an S3-compatible bucket (`STORAGE_PROVIDER=s3`, follow-up
adapter) or a persistent volume for pet photos in serverless environments.

## Backups & disaster recovery

- **Back up two things:** the database and the keys — separately.
- libSQL file DB: snapshot the file (or the volume). Turso: use Turso's backup/replication.
- To restore: provision the DB from a backup or re-run migrations, restore the keys into the
  secret store, and start the app. The checked-in SQL migrations reproduce the schema
  anywhere, and portable SQL allows migrating Turso → Postgres later.

## Configuration reference

Every setting is documented in [`.env.example`](../.env.example). Key ones:

| Var | Purpose |
|---|---|
| `APP_URL` | Public base URL (magic-link & QR/poster URLs) |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | libSQL file or Turso |
| `OPR_KEK_ACTIVE_ID`, `OPR_KEK_<id>`, `OPR_INDEX_KEY` | Encryption keys (**secrets**) |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_*` | Email delivery |
| `STORAGE_PROVIDER`, `STORAGE_LOCAL_DIR`, `S3_*` | Photo storage |
| `RATE_LIMITER` | `memory` (single instance) or `db` (multi-instance, follow-up) |

## Health & monitoring

The app is stateless apart from the database; run multiple instances behind a load balancer
(add a shared rate limiter first). Monitor the audit chain periodically with the
`verifyAuditChain` verifier, and alert on notification `failed` rows.
