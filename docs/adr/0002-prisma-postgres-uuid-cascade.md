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
- Because the database enforces it, an orphan row is an impossible state. Code that
  meets one logs it rather than passing it off as ordinary. Whether it then fails or
  drops the row is a per-call judgement: `TitleService.toResponse` throws, because a
  title with no aggregates would serialise as a plausible-looking zero, while
  `findWatchlist` drops the row and adjusts the count, because failing a whole page over
  one vanished title serves nobody. What is not acceptable is silence.
- Migrations are generated with `prisma migrate diff` and applied with `migrate deploy`;
  `migrate dev` does not work non-interactively in this setup. The generated SQL always
  contains a spurious `DROP INDEX "Title_name_trgm_idx"` — see `docs/DOMAIN.md`.
