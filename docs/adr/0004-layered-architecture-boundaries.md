# 0004 — Layered architecture with enforced boundaries

**Status:** Accepted

## Context

The project must remain understandable and maintainable by future contributors for decades,
keep the framework replaceable, and guarantee that privacy-critical code (crypto) is never
bypassed. Ad-hoc imports across concerns erode all three over time.

## Decision

Adopt a strict layered architecture with a one-way dependency direction, **enforced in CI**
by `eslint-plugin-boundaries`:

```
app → services → { domain · db · providers · crypto · security }
```

- `app/` (Next routes/actions) may only import `services`, `domain`, `config`, `lib`.
- `services/` orchestrate one use case each and may import the lower layers.
- `domain/` is pure (no framework/DB/provider imports).
- external vendors live behind `providers/` interfaces selected by config.
- `crypto/` and `security/` are isolated.

## Consequences

- The framework, database, and any vendor can be replaced by touching one layer.
- The compiler and linter prevent, e.g., a page from reading the database or a key directly —
  a violation fails CI (demonstrated during initial development).
- Slightly more indirection (a service per use case, repositories per aggregate); accepted as
  the cost of long-term maintainability and testability.
