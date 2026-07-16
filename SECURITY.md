# Security Policy

The Open Pet Registry holds data whose disclosure can put pets and people at risk. We take
security seriously and welcome responsible disclosure.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately via GitHub's **"Report a vulnerability"** (Security → Advisories)
on the repository, or email the maintainers at the address listed in the repository profile.
Include:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- affected version/commit,
- any suggested remediation.

We aim to acknowledge reports within a few days and to keep you updated as we investigate and
fix. We will credit reporters who wish to be credited once a fix is released.

## Scope

In scope: this codebase and its default configuration. Especially valued:

- any path that exposes owner PII to a finder or unauthenticated user,
- microchip enumeration or lookup responses that distinguish match from no-match,
- authentication/session flaws (magic-link replay, session fixation, CSRF),
- weaknesses in the envelope-encryption or key-management design,
- audit-log tampering that the chain verifier would not detect.

## Handling secrets

Never include real owner data, production keys, or access tokens in an issue, PR, or report.
Encryption keys (`OPR_KEK_*`, `OPR_INDEX_KEY`) must never be committed. See
[`docs/KEY-MANAGEMENT.md`](docs/KEY-MANAGEMENT.md).
