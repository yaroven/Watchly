# ADR-0016 — Reactions are absolute, Redis holds them, Postgres counts them

**Status:** accepted. Supersedes the toggle half of ADR-0014: the route pair and the
response shape survive, but reacting is no longer a toggle and no longer resolved in
the transaction that writes it.

## Context

Reacting was one synchronous transaction and a toggle: `POST` with a vote meant "cast
this, or withdraw it if it is what I already hold", resolved by reading the row,
followed by a `groupBy` over every reaction on the subject and a write of
`EngagementCounters`. It worked, and it still would.

The toggle is the part worth dwelling on, because every correctness problem in the
first draft of this design traced back to it. A toggle makes the server *decide*: it
has to know what the viewer holds before it can know what they want. That turns every
stale or missing read into a wrong write — a cold cache withdrawing a vote the viewer
was casting, a fallback path deciding from a row that a pending flush had not reached
yet. None of those are bugs in the cache; they are bugs in asking the server a question
it has to look up the answer to.

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
  "what do I hold" nor "withdraw it". It would have made `myReaction` unimplementable
  and, back when reacting was a toggle, the toggle too; the ±0.81% error would have
  made the count it *can* give unfit for a column. Nothing in the delivered design
  needs an approximate count.
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
  not look alike: a missing key sends the caller to the row, `N` answers on its own.
  With a toggle this was load-bearing for correctness — without it the first click
  after a Redis restart re-cast the vote the viewer meant to withdraw and answered 200
  having changed nothing. Absolute writes removed that failure, and the distinction
  still decides what a flush mirrors and what a page renders.
- **A miss is cheap and a flush is not needed to recover from one.** The pair's row is
  found through the unique index that already exists (`@@unique([titleId, userId])`),
  so the fallback is one `findUnique`, not a repair job.
- **Nothing decides anything.** `PUT /reactions/:entityType/:entityId` carries the
  vote the viewer wants to hold and `DELETE` carries none; the client already knows
  what it is displaying, so it is the one place where the intended end state is known
  without a lookup. `set` writes it with `SET … GET` — one round trip, unconditional,
  and the old value comes back for free to correct the counts in the response. Two
  concurrent writes mean the later one wins, which is what they should mean, so there
  is no read-decide-write left to race over and no Lua script needed to protect one.

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
- **Sending the same vote twice is not an undo.** That is the one behaviour change a
  client can see, and it is the point: the previous contract made the second of two
  identical requests — a double click, a retry after a timeout — mean the opposite of
  the first. `PUT` and `DELETE` are both idempotent now, so a retry is safe.
- **The client owns the decision, and that is the right place for it.** It renders the
  heart; it knows whether tapping it means "like" or "stop liking". The server knowing
  better required it to read state it might not have.
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
- **A nightly sweep repairs the counters and reports what it repaired.** Two aggregate
  queries per arc, no dirty-subject tracking — that list would have to live in the same
  Redis whose disagreements it exists to catch. It runs in the worker, which has one
  replica, so it needs no leader election; the repair count goes through Redis to a
  gauge in the api, because the worker serves no `/metrics`.
- The cache is **not** consulted for counts, ever. If that changes, the hydration
  problem a set would have had comes back, and this record should be superseded rather
  than amended.
