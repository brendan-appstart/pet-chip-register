# Open Pet Registry — Product & Technical Specification

> **Status:** Living document. Reflects the walking-skeleton MVP as built, plus the
> forward-looking design it is engineered toward. Update this file as the system
> evolves — it is the single reference for what the registry is and why.
>
> **Working title:** "Open Pet Registry" (name not final).
> **Last updated:** 2026-07-16.

---

## 1. Vision & mission

Build the world's most trusted, free, open-source pet-identification registry whose
sole purpose is **reuniting lost pets with the people who love them**. This is public
infrastructure, not a revenue vehicle. The success metric is **pets reunited** —
average reunion time, registry uptime, and adoption by shelters/vets — never revenue.

The project is a direct response to the failure of prior registries. The research in
[`phase1results.md`](./phase1results.md) and [`phase2.md`](./phase2.md) documents how
**Save This Life** became stranded: its data trapped on one company's cloud account,
its privacy provenance unknown, and its microchip prefixes (`991`, `900164`)
enumerable. Those three failure modes — vendor lock-in, unclear data custody, and
enumeration — drive this design.

## 2. Core principles

1. **Core registry is forever free.** Anything implementable in software (registration,
   updates, chip lookup, owner notification, QR pages, lost mode, posters, future AI
   posters/translation/SMS) is free. No ads. Data is never sold.
2. **Software open, data private.** The code is open source (AGPL-3.0). Production data
   is never public. Owner PII is always encrypted at rest. Possessing a microchip number
   must never expose owner PII.
3. **Long-term survival.** Assume the original creators disappear. Another developer,
   nonprofit, or university must be able to keep it running with minimal effort. No single
   person is required.
4. **No vendor lock-in.** Every component — database, auth, hosting, email, SMS, storage,
   AI — is replaceable behind an interface. Nothing depends permanently on one company.
5. **Accessibility, privacy, maintainability, openness** are first-class, not afterthoughts.

## 3. Scope

### In scope (walking-skeleton MVP — built)
- Owner registration & passwordless (magic-link) sign-in.
- Pet registration: species, breed, color, sex, description, photo, microchip, emergency
  contacts. Multiple owners per pet (schema-level; single-owner UI for now).
- **Secure microchip lookup**: a finder enters a chip number; the owner is notified; the
  finder learns nothing about registration or ownership.
- Owner portal: manage pets, chips, contacts, photo, contact details; view audit-relevant
  actions (recorded).
- Public per-pet QR page + printable poster.
- **Lost Mode**: one toggle flips the public page to a LOST alert and enables a poster.
- Encrypted owner/contact/finder PII; tamper-evident audit log.

### Deferred (designed-for, behind interfaces — not built)
SMS and push notifications; AI-generated posters, social posts, and translation;
medical-record timeline; multi-owner and ownership-transfer UI; shelter/vet/municipality
subscriptions and APIs; NFC tags; import/export tools; registry-health monitoring.

## 4. Personas

- **Owner (Olivia).** Wants her pet protected with minimal fuss; low technical skill;
  values that her details are private and that the service won't disappear or spam her.
- **Finder (Frank).** Found a pet with a chip; wants to help fast, without a login,
  without exposing his own details publicly.
- **Shelter/Vet (Sam).** Scans chips daily; wants a fast, reliable lookup; a future
  bulk/API path.
- **Operator/Steward (Ops).** Runs an instance; needs one-command setup, key management,
  backups, and disaster recovery; may be a successor org taking over the project.
- **Contributor (Dev).** Wants a clean codebase, clear architecture, tests, and docs.

## 5. Key user journeys

1. **Owner registration & first pet.** Enter email → click magic link → register a pet →
   (optionally) add chip, photo, emergency contacts → download QR tag.
2. **Finder → reunion.** Find a pet → open `/lookup` (or scan the QR → `/p/{token}`) →
   enter the chip number and (optionally) how to reach them → owner is emailed the finder's
   message; finder sees only a neutral acknowledgement.
3. **Lost pet.** Owner flips Lost Mode → public page shows LOST with last-seen/reward →
   owner prints the poster (QR + details) and shares the link.
4. **Emergency.** Emergency contacts stored (encrypted) so a future workflow can reach a
   backup human. (MVP: stored; automated emergency fan-out is future.)
5. **Ownership transfer** (future). Current owner initiates transfer; new owner accepts;
   audit trail records the change; old owner's access is revoked.

## 6. Architecture

Next.js (App Router) + TypeScript, with a strict layered dependency direction enforced in
CI by `eslint-plugin-boundaries`:

```
app (thin framework)  →  services (one file per use case)
                              ├─ domain   (pure business logic)
                              ├─ db       (Drizzle repositories + schema)
                              ├─ providers(email/sms/poster/translate/storage/ratelimit)
                              ├─ crypto   (AEAD, keyring, envelope, blind index)
                              └─ security (hashing, audit chain)
```

- **`app/`** route handlers and Server Actions only validate input, resolve the session,
  call one service, and map the result. No business logic, no direct DB/crypto access.
- **`services/`** orchestrate a single use case (`registerPet`, `verifyMagicLink`,
  `lookupChip`, `notifyOwnersOfContact`, …).
- **`domain/`** is pure and framework-free (chip/email normalization, the lookup response
  policy, PII shapes + AAD builders).
- **`db/`** is Drizzle over Turso/libSQL. Portable SQL (text ULID PKs, integer epoch-ms
  timestamps, blob ciphertext, no SQLite-only functions in queries) keeps a Postgres swap
  mechanical. Repositories isolate all queries.
- **`providers/`** are swappable adapters selected by config. **`crypto/`** and
  **`security/`** are isolated and heavily tested.

**Runtime & deployment.** Self-hostable first: `output: standalone` Next build runs on any
Node host or in the provided Docker image; also deploys to Vercel. Nothing requires a
proprietary platform.

## 7. Data model

12 tables (see `src/db/schema/index.ts`). Every PII-bearing row carries an **envelope**
column group: `*_ciphertext, *_nonce, *_wrapped_dek, *_kek_id, *_alg`.

| Table | Purpose | Sensitive handling |
|---|---|---|
| `owners` | accounts | `email_lookup_hash` (HMAC blind index, unique) + `ENVELOPE(pii)` = {email, name?, phone?, address?} |
| `pets` | pets | `public_token` (random, rotatable, in QR/URL); attributes are low-sensitivity plaintext |
| `owner_pet_links` | multi-owner | (owner, pet, role), unique pair |
| `microchips` | chips | `chip_number_hash` (**unique blind index — the hot lookup key**), `chip_last4`, `ENVELOPE(chip)` |
| `emergency_contacts` | backups | `ENVELOPE(pii)` |
| `magic_link_tokens` | auth | `token_hash` (sha256), 15-min expiry, single-use `consumed_at` |
| `sessions` | auth | `session_token_hash` (unique), revocable, sliding+absolute expiry |
| `lookup_events` | finder events | `chip_number_hash`, `matched_pet_id` (never shown to finder), `ENVELOPE(finder)` |
| `notifications` | delivery log | reference ids + status only; **no cleartext PII** |
| `lost_mode_status` | lost state | per-pet; coarse last-seen (opt-in), reward, public message |
| `audit_log` | tamper-evident trail | append-only **hash chain** (`prev_hash` → `row_hash`) |
| `audit_chain_head` | chain tip | pins the head hash for safe extension/verification |

**Deletion = crypto-shred.** Destroying a row's wrapped DEK renders its ciphertext
permanently unrecoverable — the basis for hard deletion / erasure. Foreign keys use
restrict semantics, never silent cascade.

## 8. Security & privacy design

### Envelope encryption (`src/crypto/`)
- Fresh 256-bit **DEK per record**; AES-256-GCM (AEAD). The DEK is wrapped by the active
  **KEK**, which is supplied via `OPR_KEK_<id>` (env/KMS) and **never stored in the DB or
  logs**.
- The `aad` binds each ciphertext to its `owner:{id}:pii:v1` (entity + purpose + schema
  version), so rows cannot be swapped or replayed; GCM verifies the tag before returning
  any plaintext.
- **Rotation** adds a new KEK version and re-wraps DEKs (`rewrap`) — the record ciphertext
  is untouched, so rotation is cheap. Designed for future **threshold** (Shamir) and
  **escrow** key custody (`Keyring.getKek` is async).
- A separate index pepper (`OPR_INDEX_KEY`) keys the blind indexes, so leaking an index
  yields neither plaintext nor decryption power.

### Secure lookup invariant (`src/services/lookup.ts`, `src/domain/lookup/policy.ts`)
- Chip numbers are stored only as `HMAC-SHA256(pepper, "chip"‖number)` — a DB leak is not a
  chip list.
- **Identical neutral acknowledgement** for match and no-match, plus a small random delay to
  blunt timing analysis. The finder never receives owner data; the relay is one-directional
  (finder → owner).
- Layered rate limits (per-IP, per-chip-hash) resist enumeration of the known guessable
  prefixes. Finder input is treated as untrusted and escaped in HTML surfaces.

### Auth (`src/services/auth.ts`)
- Passwordless magic links: 256-bit token, sha256 at rest, 15-minute expiry, **atomic
  single-use** consume (`UPDATE … WHERE consumed_at IS NULL`), and a **POST-confirm** page so
  email prefetchers can't burn a link. Neutral "check your email" prevents account
  enumeration. Sessions are opaque, server-side, revocable; cookie is `httpOnly; Secure;
  SameSite=Lax`. Origin checks (Next Server Actions) + security headers (middleware).

### Threat model (highlights)

| Threat | Mitigation |
|---|---|
| Chip enumeration (guessable prefixes) | Blind-index hashing; per-IP + per-chip rate limits; uniform neutral responses + latency jitter; (future) PoW/CAPTCHA challenge |
| PII leak via lookup | No owner data to finder ever; one-directional relay; identical match/no-match ack; minimized, audited decryption |
| Magic-link interception | 15-min single-use tokens hashed at rest; POST-confirm; TLS-only; neutral responses |
| KEK compromise | KEK never in DB/logs; fast rotation + crypto-shred; index pepper separated; threshold/escrow path reserved |
| Audit tampering | Append-only hash chain; verifier recomputes from genesis; (future) INSERT-only DB grant + external anchoring |
| Session theft / CSRF | httpOnly+Secure+SameSite cookies; revocable sessions; Origin allowlist on mutations |
| Photo location leak | EXIF/GPS stripped on upload (sharp re-encode); size/type bounds |

## 9. Route & action surface

Public: `/` (landing), `/lookup` (+ lookup action), `/p/[token]` (public pet + contact
action), `/p/[token]/poster` (printable HTML), `/media/[...key]` (photo serving).
Auth: `/auth/request`, `/auth/verify` (POST-confirm), logout action.
Owner (session-gated): `/owner`, `/owner/pets/new`, `/owner/pets/[petId]` with actions for
register/update pet, add chip, add contact, upload photo, set lost mode, update profile.

State changes use Next Server Actions with redirect-based results, so the app works without
client JavaScript (progressive enhancement) — important for durability and accessibility.

## 10. Governance

- License **AGPL-3.0-or-later** so any hosted fork's source stays open — preventing a future
  re-strand of the data behind closed source.
- Public roadmap, issue tracker, ADRs (`docs/adr/`), and (future) an RFC process.
- Initial maintainer(s) with additional maintainers added over time; no single maintainer
  required forever. Transparent decision-making; a documented long-term stewardship plan is
  a required deliverable (`docs/STEWARDSHIP.md`, planned).

## 11. Operations & disaster recovery

- **One-command dev:** `npm install && npm run setup && npm run dev` (setup = keygen +
  migrate + seed). Dummy data included.
- **Backups:** the entire registry is a libSQL/Turso database plus the KEK/index keys.
  Back up both — **separately** (keys must never live with the ciphertext). Losing the KEK
  makes owner PII unrecoverable by design.
- **Recovery / migration:** checked-in SQL migrations reproduce the schema anywhere;
  Drizzle + portable SQL allow moving Turso→Postgres. Key rotation and crypto-shred are
  first-class. See `docs/KEY-MANAGEMENT.md` (planned) and `docs/deploy.md`.

## 12. Testing strategy

- **Unit** (Vitest): crypto (round-trip, tamper/AAD/wrong-KEK rejection, rewrap, blind-index
  determinism/namespacing) with a coverage gate on `src/crypto/`; domain normalization and
  lookup policy.
- **Integration** (Vitest + real libSQL): lookup→notify, no-match indistinguishability, rate
  limiting; magic-link single-use under concurrency; at-rest privacy (DB holds only
  ciphertext + round-trips); audit-chain intact + tamper detection.
- **E2E** (Playwright): the critical journeys against a real server and dev email outbox —
  sign-up via magic link, register pet + chip, finder lookup notifies owner, lost mode +
  scannable poster.

## 13. Accessibility & internationalization

- Semantic HTML, labelled form controls, visible focus states, skip-link, and a color system
  with sufficient contrast; forms work without JavaScript.
- Copy is centralized enough to localize; a `Translator` provider interface exists so
  posters/pages can be translated later. Full i18n (locale routing, RTL) is a roadmap item.

## 14. Roadmap (post-MVP)

SMS + push notifications · AI posters/social/translation · medical-record timeline ·
ownership-transfer & multi-owner UI · shelter/vet/municipality APIs and bulk onboarding ·
NFC · import/export & other-registry migration tools · registry-health monitoring ·
DB-backed rate limiter + S3 storage adapter · threshold/escrow key custody · WebAuthn/passkeys.

## 15. Open questions

- Final project name and domain.
- Data-custody policy for any future import from defunct registries (legal review required;
  see the Save This Life research docs).
- Hosted reference instance vs. self-host-only distribution.
