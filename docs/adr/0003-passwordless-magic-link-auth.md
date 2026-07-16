# 0003 — Passwordless magic-link authentication

**Status:** Accepted

## Context

Owners need to sign in without introducing a third-party auth SaaS (no vendor lock-in) and
without the liability of storing passwords. The audience is non-technical pet owners who log
in rarely.

## Decision

Use **self-hosted, passwordless email magic links** stored in our own database. A request
emails a 256-bit single-use token (stored only as a SHA-256 hash) that expires in 15 minutes;
verification consumes it atomically. A deliberate **POST-confirm** step prevents email
prefetchers from burning the single-use link. Sessions are opaque, server-side, and
revocable, carried in an `httpOnly; Secure; SameSite=Lax` cookie. The design leaves room for
passkeys/passwords via an `AuthStrategy` abstraction and the generic `sessions` table.

## Consequences

- No password storage, no auth vendor, full control over the flow and its audit trail.
- Requires reliable email delivery (any SMTP host); deliverability is an operator concern.
- Neutral responses everywhere avoid account enumeration. Revocable server-side sessions
  (not stateless JWTs) support least privilege and 20-year auditability at the cost of a
  session lookup per request.
