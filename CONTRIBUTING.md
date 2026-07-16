# Contributing to Open Pet Registry

Thank you for helping reunite lost pets with their people. This project is meant to outlive
any single contributor, so we value clarity, tests, and small well-bounded changes.

## Getting started

```bash
npm install
npm run setup   # keygen + migrate + seed demo data
npm run dev
```

Magic-link and notification emails print to the console and to `./var/dev-outbox.jsonl` in
development.

## Before you open a PR

Run the same checks CI runs:

```bash
npm run typecheck
npm run lint       # includes architecture-boundary enforcement
npm test           # unit + integration
npm run test:e2e   # optional locally; runs in CI
```

## Architecture rules (enforced)

The dependency direction is enforced by `eslint-plugin-boundaries`:

```
app → services → { domain · db · providers · crypto · security }
```

- `app/` (Next routes/actions) must not import `db`, `crypto`, `providers`, or `security`
  directly — go through a `services/` function.
- `domain/` is pure: no framework, DB, or provider imports.
- `crypto/` and `security/` are isolated and must stay heavily tested.
- Anything that talks to an external vendor (email, SMS, storage, AI) goes behind a provider
  interface in `providers/` and is selected by config — never hard-code a vendor.

## Privacy & security expectations

- Never log plaintext PII, tokens, or keys.
- Owner PII must be stored via the envelope cipher; sensitive lookup keys via the blind
  index. Never add a plaintext email/chip column.
- Any change to the lookup flow must preserve the invariant: **a finder learns nothing about
  registration or ownership** (identical match/no-match responses).
- Add or update tests for security-relevant changes (`tests/unit/crypto`, `tests/integration`).

## Commits & PRs

- Keep PRs focused; describe the change and its rationale.
- Include tests and update docs (`docs/spec.md`, ADRs) when behavior or architecture changes.
- For notable design decisions, add an ADR in `docs/adr/` (see the existing ones).
- By contributing you agree your contributions are licensed under the project's
  [AGPL-3.0-or-later](LICENSE).

## Reporting security issues

Please follow [`SECURITY.md`](SECURITY.md) — do not open public issues for vulnerabilities.
