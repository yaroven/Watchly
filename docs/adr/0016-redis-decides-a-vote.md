# ADR-0016 — Redis decides a vote, Postgres counts it

**Status:** accepted. Narrows ADR-0014: `ReactionService.vote` / `unvote` keep the
route pair and the response shape, but the toggle is no longer decided in the
transaction that writes it.

## Context

Reacting was one synchronous transaction: toggle the `Reaction` row, `groupBy` every
reaction on the subject, write `EngagementCounters`, answer with the result. It worked,
and it still would.

What prompted the change was not load. The client has never called
`POST|DELETE /reactions/:entityType/:entityId` — `StreamFilmInfo.tsx` and
`CommentCard.tsx` hold like state in local React state — and until the commit before
this one `ReactionModule` was imported by nothing, so those routes answered 404 in
every running process. The scale this is designed against is roughly a thousand users,
five hundred titles and twenty thousand comments.

**So this is a deliberate exercise in the write-behind shape, chosen with its cheaper
alternative costed and rejected.** The cheap fix for the only cost the hot path
actually had was to replace the `groupBy` with `likes = likes + delta` and keep
everything in Postgres. Anyone reading this layer and concluding it is premature
optimisation is reading it correctly; what they are missing is that the trade was made
knowingly, and the paragraph below is what the knowing part bought.

Two options were rejected on their merits rather than on cost:

- **HyperLogLog for "who liked"**, which was the original sketch. It estimates
  cardinality; it has no membership test and no deletion, so it can answer neither
  "what do I hold" nor "withdraw it". It would have made the toggle and `myReaction`
  unimplementable, and the ±0.81% error would have made the count it *can* give unfit
  for a column. Nothing in the delivered design needs an approximate count.
- **A set of voters per subject** (`SADD` / `SCARD`), which does answer membership
  exactly and gives the count for free. Rejected once the count stayed in Postgres:
  the question being asked is always about *one* viewer, and a set makes answering it
  depend on the whole set being present — which means hydrating every vote on a
  subject, under a lock, on any miss. Twenty thousand comments is forty thousand keys
  to keep complete in order to answer a question about one pair.

## Decision

**One key per (subject, viewer) pair**, holding that pair's vote and nothing else:

```
vote:<title|comment>:<subjectId>:<userId>  =  "L" | "D" | "N"      TTL 7d
```

Redis is the truth about **what a viewer holds**; Postgres stays the truth about **how
many**. `EngagementCounters` is still read as a relation, still written only by
`EngagementCountersService`, still recomputed with a `groupBy` on the client of the
transaction that writes the row — the caller is now a queue processor rather than a
controller.

Three properties carry the design:

- **`N` is a stored answer.** "Holds no vote" and "this cache has not been asked" must
  not look alike. A missing key sends the caller to the row and writes back what it
  finds; `N` answers on its own. Without it, the first click after a Redis restart
  re-casts the vote the viewer meant to withdraw and answers 200 having changed
  nothing.
- **A miss is cheap and a flush is not needed to recover from one.** The pair's row is
  found through the unique index that already exists (`@@unique([titleId, userId])`),
  so the fallback is one `findUnique`, not a repair job.
- **The transition is a pure function.** `nextVote(current, requested)` is the whole
  toggle, and it is tested without a server. The read-then-write around it is not
  atomic: the only racers are one viewer against themselves on one subject, and the
  flush mirrors whatever Redis ends up holding, so the worst case is that one of two
  clicks milliseconds apart does not count. A Lua script would close that window at
  the price of moving the decision somewhere a unit test cannot reach.

## Consequences

- **The TTL is a self-healing bound, not a memory budget.** A key is about a hundred
  bytes and there is one per vote. Seven days is the longest any disagreement between
  the cache and the rows can survive unnoticed, because an expired key is read back
  from Postgres.
- **Losing Redis loses at most the votes not yet flushed.** It does not corrupt
  anything: every key can be rebuilt from the rows, and a duplicate flush is caught by
  the unique index. The window is the flush delay.
- **Reacting now depends on Redis.** A route that used to need only Postgres answers
  503 when Redis is unreachable — fail-closed on the write, because accepting a vote
  there is nowhere to put is worse than refusing it. Reads degrade instead: they fall
  back to the viewer's row.
- **The counts a response carries are the last flushed ones plus this request's own
  delta.** `myReaction` is exact. Other viewers see the new count after the flush.
  `ReactionResultDto` did not change shape, but "recomputed by this call" stopped being
  true of it.
- **Reads take `myReaction` from the cache and the counts from the relation.** One
  `MGET` per page; a pair the cache has no answer for falls back to the `reactions`
  relation the read already loaded, which costs nothing and is the same number the
  endpoint served before. Preferring the relation when the cache *does* have an answer
  would render a vote that the viewer's next click contradicts — the cold-cache bug
  again, one layer up.
- **`ioredis` is a direct dependency**, pinned to the 5.x BullMQ already resolves so the
  tree holds one copy. `RedisService` extends the client the way `PrismaService` extends
  `PrismaClient`, and runs with `enableOfflineQueue: false` so a command issued against
  a down socket rejects instead of hanging.
- The cache is **not** consulted for counts, ever. If that changes, the hydration
  problem a set would have had comes back, and this record should be superseded rather
  than amended.
