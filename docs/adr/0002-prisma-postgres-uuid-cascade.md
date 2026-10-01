# ADR-0002 — Prisma + Postgres, uuid keys, cascade deletes

**Status:** accepted

## Context

A catalogue with deep ownership chains (title → season → episode, title → comment →
reply) and ids that appear in URLs.

## Decision

Postgres through Prisma. Primary keys are `String @id @default(uuid())`. Child rows
declare `onDelete: Cascade`.

## Consequences

- Ids are safe to expose in URLs and don't leak row counts.
- Deleting a title removes its seasons, episodes, ratings, reactions, comments and
  watchlist entries without application code.
- Because the database enforces it, orphan rows are an impossible state — code that
  encounters one should treat it as a broken invariant and fail loudly, not filter it
  away.
- Migrations are generated with `prisma migrate diff` and applied with `migrate deploy`;
  `migrate dev` does not work non-interactively in this setup. The generated SQL always
  contains a spurious `DROP INDEX "Title_name_trgm_idx"` — see `docs/DOMAIN.md`.
