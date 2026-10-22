# ADR-0013 — Comments and reports take the same polymorphic key

**Status:** accepted. Extends ADR-0012 to two more tables; supersedes the comment half
of ADR-0003 (`TitleComment`) and narrows ADR-0002 further.

## Context

ADR-0012 replaced two reaction tables with one keyed by `(entityType, entityId)`. The
same duplication was queued up behind it: posts and blogs are planned, and both want
comments and both want reporting. `TitleComment` could only hang off a title, and
`CommentReport` could only point at a comment, so each new subject meant another table
with the same columns and the same service code.

A second question came with it: a reply was a `parentId` self-relation, which is a
*third* way of saying "this hangs off that".

## Decision

`Comment` and `Report` are addressed the way `Reaction` is.

```prisma
model Comment { entityType CommentEntityType  // TITLE | POST | COMMENT
                entityId   String }

model Report  { entityType ReportEntityType   // COMMENT | POST
                entityId   String }
```

`parentId` is gone: **a reply is a comment whose subject is a comment.** One key answers
"what is this under" and "what is this a reply to", and the depth rule is unchanged —
threads stay one level deep, enforced by `CommentService` and not by the schema, so it
can be relaxed without a migration.

`ReportService` owns reporting the way `ReactionService` owns reactions: one standing
report per person per thing, and `removeFor` for cleanup. `CommentService` keeps the
threading, the previews and the counting.

`POST` exists in both enums with no table behind it. Both services refuse it explicitly
rather than writing a row whose subject cannot be checked.

## Consequences

- **Three tables now carry no foreign key to their subject**, so the database cascades
  none of them. The cleanup chain is explicit and transactional:
  `CommentService.removeThread` takes a comment, its replies, and the reactions and
  reports on both; `CommentService.removeForSubject` takes every thread under a subject;
  `TitleService.delete` calls that and then removes the title's own reactions. A new
  reactable, commentable or reportable kind must join this chain by hand.
- `TitleModule` now imports `CommentModule`, which ADR-0011 had deliberately left
  unimported. The alternative was `TitleService` knowing what a comment thread is made
  of. The direction is one-way and must stay so: comments never import titles (the
  existence check is a plain function, `assertTitleExists`).
- A reply no longer knows its title. `findAuthorScores` needs one, so it resolves the
  thread first — the subject for a root read, the replied-to comment's own subject for a
  reply read. A thread under anything but a title reports no author scores, because only
  titles have ratings.
- The `titleId` column is gone, so "every comment this user left on titles" is no longer
  a single indexed predicate. Nothing in the API asks for that today.
- `POST /titles/:id/comments` keeps its shape, `parentId` in the body included: the
  controller turns it into a subject. No client change.
