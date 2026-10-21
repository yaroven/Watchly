# ADR-0012 — One polymorphic `Reaction` table

**Status:** accepted. Supersedes the reaction half of ADR-0003 (`TitleReaction`) and
narrows one consequence of ADR-0002.

## Context

`TitleReaction` and `CommentReaction` were the same table twice: a user, a `LIKE` or
`DISLIKE`, a unique constraint on (subject, user), an index on (subject, type), and in
the services the same toggle, the same `groupBy` densified into the same map. The only
difference was the name of the foreign key column.

Posts are planned and would react the same way. That would have been a third copy of
the table, a third copy of the toggle, and a third copy of the counting.

## Decision

One table, addressed by what it points at rather than by a column per kind:

```prisma
model Reaction {
  entityType ReactionEntityType // TITLE | COMMENT
  entityId   String
  userId     String
  type       ReactionType

  @@unique([entityType, entityId, userId])
  @@index([entityType, entityId, type])
}
```

A new kind of reactable thing is a value in `ReactionEntityType`, not a table.

`ReactionService` owns the mechanics — toggle, withdraw, batch counts, the viewer's own
votes, and removal by subject. `TitleService` and `CommentService` call it and keep
their own aggregates; neither touches the `reaction` delegate directly. Every method
takes an optional client so a caller's `$transaction` holds.

## Consequences

- **`entityId` has no foreign key, so the database cannot cascade these away.** This is
  the one place in the schema where an orphan row is reachable, which ADR-0002 otherwise
  rules out. `ReactionService.removeFor` stands in for the cascade, and the two services
  that delete a subject call it inside the same transaction as the delete:
  `CommentService.remove` (the comment and its replies) and `TitleService.delete` (the
  title and every comment that cascades with it). A third reactable kind must do the
  same — the compiler will not remind anyone.
- Prisma cannot express the relation, so `include` is out. The viewer's reaction used to
  ride along with a title read as a filtered relation; it is now one batched row read
  per page (`viewerReactions`) and the engagement block takes it as a value. Query count
  per title list goes up by one, and does not grow with page size.
- The unique constraint is wider but still one row per person per thing, and switching
  sides still updates that row.
- Counting is one `groupBy` over `(entityId, type)` for any kind, so the densify-into-a-map
  step exists once instead of per table.
- Reactions for every kind now share one table's write path. Nothing in the API serves
  mixed-kind reads, so the extra `entityType` predicate is the whole cost at query time.
