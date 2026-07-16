# 0002 — App-level envelope encryption for PII

**Status:** Accepted

## Context

Owner information must always be encrypted at rest, keys must never be stored with the
ciphertext, and the design must support future key rotation, threshold keys, and escrow.
Possessing a microchip number must never expose an owner. Database-at-rest encryption alone
does not satisfy this (a DB compromise or an over-broad query would expose plaintext).

## Decision

Encrypt PII at the **application layer** using **envelope encryption**: a fresh 256-bit
data-encryption-key (DEK) per record encrypts the record with AES-256-GCM; the DEK is wrapped
by a master key-encryption-key (KEK) supplied via env/KMS and never persisted. Ciphertext is
bound to its record via authenticated associated data (`entity:id:purpose:version`).
Sensitive lookup keys (chip numbers, emails) are stored as **blind indexes**
(`HMAC-SHA256(pepper, namespace‖value)`) with a pepper separate from the KEK.

## Consequences

- A database leak yields ciphertext and hashes, not people or a chip list.
- KEK rotation is cheap (re-wrap DEKs, not record ciphertext); deletion can be done by
  **crypto-shredding** a record's DEK; threshold/escrow custody can be added behind the async
  `Keyring` without touching callers.
- More application-side complexity and CPU per read/write; every PII path must go through the
  cipher (enforced by architecture boundaries and tests). Blind indexes are deterministic
  (needed for equality lookups), an accepted trade-off mitigated by the separate pepper.
