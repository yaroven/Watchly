# ADR-0017 — A flush writes the row, one recount per subject writes the counters

**Status:** accepted. Supersedes two consequences of ADR-0016: that the counters are
recomputed in the transaction that writes the reaction row, and that the nightly
reconciliation holds every subject of an arc in the worker's memory at once.

## Context

ADR-0016 moved the reaction write into `ReactionFlushProcessor` and kept the recount
next to it: every flush upserted or deleted one row and then ran
`COUNT(*) … GROUP BY type` over the whole subject, in one transaction. Flushes are
deduplicated per (subject, viewer) pair, so fifty viewers liking one title inside the
same two seconds produced fifty jobs and fifty identical recounts of that title. The
recount is the expensive half; the row write is a single indexed statement.

The reconciliation had the matching problem one level up: it loaded the `groupBy` of
every reaction and every `EngagementCounters` row of an arc into two maps in the
worker, which ADR-0016 named as the ceiling once subjects number in the millions.

## Decision

**The queue carries two jobs.** `flush-vote` stays deduplicated per pair and now only
mirrors the cached vote onto the row (`ReactionService.writeVote`), then asks for a
`recount-subject` job deduplicated per subject (`counts-<arc>-<subjectId>`, the same
`keepLastIfActive` and two-second delay). Every pair flushed inside one window shares
one recount. The recount is `EngagementCountersService.recomputeReactions`, unchanged,
so the service is still the only writer of the counters.

The recount is asked for only after the row write has committed, so a recount that
starts later always sees it; a write that lands while a recount is running is kept by
`keepLastIfActive` and recounted once more. A recount that fails is retried like any
other job, and a flush that fails before asking for one asks again on retry.

The synchronous fallback path is untouched: `applyAbsolute` still writes the row and
recounts in one transaction, because there is no queue to defer to when Redis is down.

**The reconciliation walks subjects by id**, a page of `RECONCILE_BATCH_SIZE` (1000)
at a time, and asks both aggregates only about that page. Memory is bounded by the page
rather than by the arc; the cost is three queries per page instead of two per arc.

## Consequences

- **The counters no longer commit with the rows they summarise.** They trail the rows
  by up to one more delay window. The nightly reconciliation already existed to repair
  disagreement between the two; it is now also what catches a recount that exhausted
  its retries.
- A vote's response is still the stored counters plus the request's own delta, so the
  viewer who voted does not see the extra lag; other viewers see it.
- The per-vote recount cost from ADR-0016 becomes a per-subject-per-window cost. The
  next step if one subject's recount itself grows too slow is still the delta that
  ADR-0016 describes, with the same ceiling.
- One subject-page query on top of the two aggregates, per thousand subjects, is the
  price of the bounded sweep: at twenty thousand comments that is sixty queries a
  night.
