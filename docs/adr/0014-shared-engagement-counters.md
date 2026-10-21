# ADR-0014 — Shared engagement counters, one reaction endpoint

**Status:** accepted. Splits the cache introduced in ADR-0011 and moves the reaction
routes out of the feature controllers.

## Context

ADR-0011 denormalised a title's engagement into `TitleEngagement` so a catalogue page
would not aggregate three tables per row. ADR-0012 and ADR-0013 then made reactions,
comments and reports polymorphic, which left the counting split in an awkward place:

- `ReactionService` counted likes for any subject, but only titles had those counts
  cached, and only `TitleService` knew how to refresh that cache
- a comment's likes were aggregated per page, and its reply count aggregated again
  beside them
- reacting went through two routes with two response shapes — `POST
  /titles/:id/reaction` answered with a whole engagement block, `POST
  /comments/:id/reactions` with counts — and a third kind would have been a third pair

`commentCount` was wanted for titles, and a comment's reply count is the same number
asked of a different subject.

## Decision

**The cache is split by who has the field, not by who asked first.**

```prisma
model EngagementCounters {   // likes, dislikes, commentCount — anything can have these
  entityType EngagementEntityType  // TITLE | POST | COMMENT
  entityId   String
  @@id([entityType, entityId])
}

model TitleEngagement {      // avgScore, ratingCount, watchlistCount — only a title
  titleId String @id
}
```

`EngagementCountersService` is the only thing that counts: `recomputeReactions` and
`recomputeComments` write a row from the tables they summarise, and every read of
likes, dislikes or comment counts goes through `countsFor`. A feature service reads a
row; it does not aggregate.

**Reacting is one route pair for every kind**: `POST|DELETE /reactions/:entityType/:entityId`,
where the segment is the plural the rest of the API already uses (`titles`, `comments`).
`ReactionService.vote` / `unvote` toggle the row *and* recompute the counters, so
casting a vote is not a job split between two services. `TitleService.react`,
`TitleService.removeReaction` and `CommentService.react` are gone.

A comment's reply count is `commentCount` on the counters row whose subject is that
comment — the same column read the same way.

## Consequences

- One call changes the counters, so they cannot drift per feature. The recompute runs
  on the caller's client, so it commits with the write that caused it.
- **The response shape changed.** Reacting answers `{likes, dislikes, commentCount,
  myReaction}` rather than a title's engagement block. The client's reaction mutations
  only invalidate their query keys, so the block is refetched; the comment list already
  applied exactly this shape.
- A title read costs one extra batched query (the counters row for the page) because
  the counters are no longer a relation Prisma can `include`. It does not grow with page
  size.
- `EngagementCounters` is a **fourth** table with no foreign key to its subject, and it
  is a cache: an orphan row here is read and rendered, not merely stale. Removal is part
  of the same transactions as the rest — `CommentService.removeThread`,
  `TitleService.delete`.
- `POST` is in the counters enum with no table behind it. `recomputeReactions` for a kind
  with no reaction rows is a no-op rather than a write of zeroes, so a future posts table
  cannot have its counts erased by a recount that found nothing to count.
- The engagement block gained `commentCount`, and it counts top-level comments only —
  replies are counted on their own parent.
