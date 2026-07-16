# Threat Model

Scope: the Open Pet Registry application and its default configuration. This complements the
security summary in [`spec.md`](./spec.md) §8.

## Assets

- **Owner PII** (email, name, phone, address) — highest sensitivity; encrypted at rest.
- **Microchip ↔ owner linkage** — the fact that a chip is registered and to whom.
- **Finder PII** — a finder's optional contact details (encrypted; relayed only to the owner).
- **Emergency-contact PII** — encrypted.
- **Auth material** — magic-link and session tokens (hashed at rest).
- **Audit trail** — integrity of the record of who did what.
- **Encryption keys** — the KEK and index pepper (out of band; see KEY-MANAGEMENT).

## Trust boundaries

- **Anonymous internet ↔ app** — finders and the lookup/public pages are unauthenticated.
- **Owner session ↔ app** — cookie-authenticated owner actions.
- **App ↔ database** — the DB is assumed potentially compromisable; it must hold no plaintext
  PII and no reversible chip list.
- **App ↔ key material** — keys live outside the DB (env/KMS).
- **App ↔ external providers** — email/SMS/storage are replaceable and semi-trusted.

## Adversaries

- **Curious/malicious finder** trying to learn an owner's identity from a chip number.
- **Mass scraper** enumerating chip numbers (the known guessable prefixes make this concrete).
- **Database thief** who exfiltrates the DB.
- **Network/link observer** (email prefetchers, shoulder surfers of URLs).
- **Malicious/compromised owner account** attempting to reach data of pets they don't own.
- **Insider / tamperer** attempting to alter history.

## Threats & mitigations

| # | Threat | Mitigation | Status |
|---|---|---|---|
| T1 | Chip enumeration to build a registry map | Blind-index hashing; per-IP + per-chip rate limits; uniform neutral responses + latency jitter | Built (PoW/CAPTCHA challenge = future) |
| T2 | Finder learns owner identity from a lookup | No owner data to finder; one-directional relay; identical match/no-match ack | Built |
| T3 | DB theft reveals PII / chip list | Envelope encryption (keys out of DB); chips stored only as HMAC | Built |
| T4 | Magic-link replay / prefetch consumption | 15-min single-use tokens hashed at rest; POST-confirm consume | Built |
| T5 | Account enumeration via auth/lookup | Neutral responses everywhere | Built |
| T6 | Cross-owner data access (IDOR) | Every owner action checks `isOwnerOfPet`; public token ≠ internal id | Built |
| T7 | CSRF / session theft | httpOnly+Secure+SameSite cookie; Origin checks; revocable sessions | Built |
| T8 | Photo GPS/EXIF leak | Metadata stripped on upload (sharp re-encode) | Built |
| T9 | Finder-supplied text injection (XSS) | Untrusted input escaped; owner alerts sent as plain text | Built |
| T10 | Audit-log tampering | Append-only hash chain + verifier | Built (INSERT-only grant + external anchoring = future) |
| T11 | KEK compromise | KEK out of DB/logs; fast rotation + crypto-shred; index pepper separated | Built (threshold/escrow = future) |
| T12 | Timing side-channel on lookup | Randomized delay; identical work on both branches | Built (best-effort) |

## Known limitations / accepted risks (MVP)

- **Blind indexes are deterministic**, enabling equality lookups and a UNIQUE constraint; the
  pepper defends against offline brute force of a stolen index, but an attacker with both the
  index *and* the pepper could confirm guessed values. Keys are kept out of the DB precisely
  to prevent this correlation.
- **Rate limiting is in-memory** by default (per instance). Multi-instance deployments need a
  shared limiter (a documented follow-up) to be fully effective against distributed scans.
- **Email is the only notification channel** in the MVP; deliverability depends on the
  operator's SMTP setup.
- **No CAPTCHA/proof-of-work** yet on lookup; rate limits are the current enumeration defense.
