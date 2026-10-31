# ADR-0016 — Reactions are absolute, Redis holds them, Postgres counts them

**Status:** accepted. Supersedes the toggle half of ADR-0014: the route pair and the
response shape survive, but reacting is no longer a toggle and no longer resolved in
the transaction that writes it. The cache sits in front of the old synchronous path as
a decorator rather than replacing it.

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
- **Reacting does not depend on Redis being up.** `CachedReactionService` decorates
  `ReactionService` and delegates to it when Redis is unreachable, so a vote is written
  synchronously to Postgres instead of refused. Reads degrade the same way, to the
  viewer's row.

  An earlier draft of this record argued for answering 503 instead, on the grounds that
  a fallback would leave the cache lying. It would not: the fallback writes no key, an
  absent key means "unknown", and the next read goes to the row the fallback just
  wrote. The real cost of falling back is narrower and worth stating exactly — **the
  fallback cannot see a vote that is still only in Redis**, so a pair the same viewer
  touched inside the flush window at the moment Redis died is answered from counts that
  are a beat behind. When reacting was a toggle that produced a *wrong vote*; with
  absolute writes it costs only the numbers in one response, and the next request fixes
  them.

  What it buys, against that: votes keep working for the whole outage rather than for
  none of it. What it costs in the code is two write paths that have to stay correct —
  one absolute through the queue, one absolute in a transaction — and a token to choose
  between them.

- **The cache is removable.** `{ provide: REACTIONS, useExisting: CachedReactionService }`
  is the only line that puts Redis on the path of a request. Pointed at `ReactionService`
  it is the pre-cache API again, synchronously correct with nothing running but
  Postgres. That is deliberate for a layer adopted without a load problem to justify
  it: the thing it replaced is still there, still tested, and one line away.
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
- **Two numbers decide when this design stops working, and they are not the same
  number.**

  *Reactions per subject* bounds the per-vote recount. `recomputeReactions` is
  `COUNT(*) … GROUP BY type` behind the unique index, so it returns two rows and costs
  the API nothing — but Postgres still walks every index entry for that subject, and
  there is no shortcut for a count. A title holding millions of reactions recounts
  millions of entries per flush, once every flush window. The answer then is a delta
  (`likes = likes + 1`), which is constant instead of linear.

  *Subjects* bounds the nightly sweep. `ReactionReconciler` builds one map entry per
  subject in the worker, so twenty thousand comments is megabytes and two million is
  hundreds of them, in a process that cannot spill. The answer then is to batch by a
  cursor over subjects, or to push the comparison into one
  `UPDATE … FROM (SELECT … GROUP BY …)` so nothing reaches Node at all — Postgres
  degrades to disk at `work_mem`, which is the whole argument: the database spills, the
  process dies.

  **The two answers are a pair, not alternatives.** A delta is a second truth that
  drifts from the rows it summarises, and the nightly sweep is what repairs that drift.
  Adopting the delta turns the reconciliation from a backstop into a requirement.

  And a delta has its own ceiling: every vote on one subject updates one row, which
  serialises those writes and leaves a dead tuple per update for autovacuum to chase.
  Past that point the counter does not belong in Postgres at all — it belongs in an
  `INCR`, which is exactly the design this record rejected at the scale it was written
  for.

- The cache is **not** consulted for counts, ever. If that changes, the hydration
  problem a set would have had comes back, and this record should be superseded rather
  than amended.

## Addendum (2026-10-31) — what the fallback rests on

The fallback above did not work as written, for two reasons the mocked specs could not
see.

- **The flush queue waited for Redis instead of failing.** `RedisService` rejects at
  once while Redis is down, but the api's BullMQ `Queue` was built on ioredis's
  defaults, so `queue.add` sat in the offline queue — and an in-flight one was resent
  up to twenty times — while the request hung. `CachedReactionService` scheduled the
  flush first, so a Redis outage never reached `RedisUnavailableError` and never fell
  back. The api's queue connection now carries `enableOfflineQueue: false` and
  `maxRetriesPerRequest: 1`, matching `RedisService`. A `Worker` keeps the defaults:
  it should wait for Redis, not give up on it. BullMQ still waits once for the first
  `ready` at startup; that path is covered by the order below, since the `SET` is the
  first thing to touch Redis and fails fast on its own client.
- **The order of the two writes could revert a vote.** With the flush scheduled before
  the `SET`, a `SET` that failed after the `add` succeeded fell back to writing the
  row, and two seconds later the flush mirrored the key's previous vote back over it.
  The key is now written first. If the `SET` fails nothing is scheduled; if the `add`
  fails the fallback writes the same vote the key holds. The remaining hole is a
  process dying between the two awaits: a key with no flush behind it, which stands
  until the viewer votes again or the TTL expires and reads go back to the row.
