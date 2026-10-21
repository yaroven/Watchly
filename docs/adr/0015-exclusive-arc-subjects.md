# ADR-0015 — Nullable foreign key per kind, not a polymorphic key

**Status:** accepted. Supersedes the addressing decision in ADR-0012, ADR-0013 and
ADR-0014; restores ADR-0002 in full.

## Context

ADR-0012..0014 addressed reactions, comments, reports and the engagement counters by
`(entityType, entityId)`. One table per concept was the right call and still is — what
was wrong was the key.

`entityId` cannot carry a foreign key, and everything followed from that:

- the database could not cascade, so `removeFor` / `removeForSubject` / `removeThread`
  existed only to do by hand what a foreign key does for free, in four services
- an orphan row became reachable — the one thing ADR-0002 says is impossible — and for
  `EngagementCounters`, which is a cache, an orphan is read and rendered
- Prisma could not express the relation, so a title's viewer reaction and its counters
  became extra batched queries and four copies of the same `Promise.all` in
  `TitleService`
- nothing stopped a row from naming no subject, or two

## Decision

One table per concept still, but addressed by **a nullable foreign key per kind** — an
exclusive arc — with a CHECK constraint that exactly one is set:

```prisma
model Reaction {
  titleId   String?   // → Title,   onDelete: Cascade
  commentId String?   // → Comment, onDelete: Cascade
  @@unique([titleId, userId])
  @@unique([commentId, userId])
}
```

```sql
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_one_subject"
  CHECK (num_nonnulls("titleId", "commentId") = 1);
```

`Comment` takes `titleId?` and `parentId?` — a reply is a comment whose *parent* is a
comment, and the self-relation cascades. `Report` has a single non-null `commentId`,
because only comments can be reported today; a nullable arc would describe a choice
that does not exist. `EngagementCounters` takes `titleId?`/`commentId?`, each unique.

In TypeScript the subject is a union — `{ titleId }` or `{ commentId }` — so a target
naming neither or both cannot be constructed, which is the CHECK restated where the
compiler can see it.

The route shape did not change: `POST|DELETE /reactions/:entityType/:entityId` still
takes `titles` or `comments`, and a pipe turns the segment into the arc.

## Consequences

- **The database enforces it again.** Deleting a title removes its comments, their
  replies, every reaction and report on any of them, and the counter rows — verified
  against a live database, not only in mocks. `ReactionService.removeFor`,
  `ReportService.removeFor`, `CommentService.removeForSubject` and
  `EngagementCountersService.removeFor` are gone, with their call sites.
- **Relations are back.** `titleQuery.engagement` includes `counters` and the viewer's
  `reactions` again; a comment read includes its counters and the viewer's vote. The
  per-page batched reads and the four `Promise.all` copies in `TitleService` went with
  them — that service lost three collaborators and ~85 lines without losing a feature.
- **A new kind is a migration, not an enum value.** Adding posts means a `postId?`
  column on three tables, three widened CHECKs and a backfill. That is strictly more
  work than appending to an enum, and it is the trade: the schema can no longer describe
  a subject it cannot point at. `POST` left both enums and both services — nothing now
  claims to support something that has no table.
- **The CHECKs are hand-written SQL that Prisma does not manage**, like
  `Title_name_trgm_idx`. `prisma migrate diff` neither creates nor drops them; they live
  in `20261018120000_exclusive_arc_subjects` and are listed in `docs/DOMAIN.md`.
- Uniqueness is per arc (`@@unique([titleId, userId])` and `@@unique([commentId, userId])`),
  which works because Postgres does not collide NULLs. One vote per person per subject
  still holds, now as two narrower indexes instead of one wide one.
- A query filtered on "every reaction regardless of subject" needs an OR over the arcs.
  Nothing in the API asks for that; the per-arc indexes are what the reads actually use.
