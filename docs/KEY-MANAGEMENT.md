# Key Management

The registry's privacy guarantee rests on a small number of secrets that must be handled
carefully. This document explains what they are, how to generate them, and how to rotate,
back up, and recover them.

## The keys

| Env var | What it is | Notes |
|---|---|---|
| `OPR_KEK_ACTIVE_ID` | Id of the active key-encryption-key (e.g. `k1`) | Points at the KEK used to wrap new data keys |
| `OPR_KEK_<id>` | A 256-bit KEK, base64-encoded | Wraps per-record data keys. **Never** stored in the DB or logs. Keep retired ids too, for rewrap |
| `OPR_INDEX_KEY` | A 256-bit pepper, base64-encoded | Keys the blind indexes (chip/email hashes). Separate from the KEK so an index leak ≠ decryption |

Data-encryption-keys (DEKs) are generated per record, wrapped by the KEK, and stored
(wrapped) in the database. Plaintext DEKs live only transiently in memory.

## Generating keys

```bash
npm run keygen   # creates .env from .env.example if needed, writes missing keys
```

`keygen` **never overwrites an existing key** — overwriting a KEK would make all data it
wrapped unrecoverable. To create a key by hand:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Backups (critical)

Two things must be backed up to recover the registry:

1. the **database** (libSQL file or Turso), and
2. the **keys** (`OPR_KEK_*`, `OPR_INDEX_KEY`).

**Back them up separately.** Keys stored alongside the ciphertext defeat the encryption. A
reasonable setup: database in normal backups; keys in a secrets manager / KMS / offline
vault. **If you lose the active KEK, encrypted owner PII is unrecoverable by design.**

## Rotation

The envelope design makes KEK rotation cheap (only the small wrapped-DEK is re-encrypted;
record ciphertext is untouched):

1. Generate a new KEK and add it, e.g. `OPR_KEK_k2=<base64>`.
2. Point `OPR_KEK_ACTIVE_ID=k2`. Keep `OPR_KEK_k1` present so existing records still open.
3. Run a rewrap sweep (batch `EnvelopeCipher.rewrap` over PII rows) — *rewrap tooling is a
   near-term follow-up; the primitive exists in `src/crypto/envelope.ts`.*
4. Once every record reports `kek_id = k2`, retire `OPR_KEK_k1`.

The index pepper (`OPR_INDEX_KEY`) is **not** trivially rotatable — changing it invalidates
all blind indexes and would require recomputing them from decrypted values. Treat it as
long-lived.

## Deletion / right-to-be-forgotten (crypto-shred)

Destroying a record's wrapped DEK renders its ciphertext permanently unrecoverable. This is
the intended mechanism for hard deletion and erasure requests. (A `shred` operation and
retention policy are a planned addition; the cryptographic basis is in place.)

## Future: threshold & escrow

`Keyring.getKek` is async specifically so a future implementation can assemble a KEK from
Shamir shares (no single custodian holds the whole key) or unwrap an escrowed key held by a
successor nonprofit — without changing any calling code. This supports the charter's
"future nonprofit stewardship" and "emergency recovery" goals.
