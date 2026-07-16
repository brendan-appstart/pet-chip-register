# 0005 — License: AGPL-3.0

**Status:** Accepted

## Context

The charter requires the software to be open source forever and forbids re-closing it. A
registry is typically run as a network service, where permissive and even standard copyleft
licenses do not compel a hosting operator to share their (possibly modified, possibly
closed) source. That is exactly the "re-strand the data behind closed source" failure mode
this project exists to prevent.

## Decision

License the project under **AGPL-3.0-or-later**. The AGPL's network-use clause requires that
anyone who runs a modified version as a network service offer that version's source to its
users.

## Consequences

- Any hosted fork must keep its source open — aligning the license with the "forever open"
  promise and protecting owners from a future closed re-launch.
- Some companies avoid AGPL dependencies; this may reduce certain corporate adoption. That
  trade-off is acceptable given the project's public-infrastructure mission. A more permissive
  license (Apache-2.0) was the considered alternative and was rejected for not compelling
  source availability for hosted services.
