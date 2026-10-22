# ADR-0011 — Engagement lives in the title module

**Status:** accepted

## Context

ADR-0003 split score, reaction, comment and watchlist into four tables. The modules
were drawn to match: `title-rating/` and `title-engagement/` alongside `title/` and
`comment/`.

Three things came out of that, and all three were paid for repeatedly:

- Understanding one `GET /title/:id` response meant reading three directories.
- Both aggregate services densified a sparse `groupBy` by hand — the same algorithm
  written twice, with its reasoning spelled out in prose in both places, because
  `TitleService.toResponse` treats a missing map entry as a broken invariant.
- `TitleService` took six collaborators. Two of them were these.

The seam between them was never real. `TitleRatingService` and
`TitleEngagementService` had exactly **one** external consumer between them —
`TitleService` — plus their own controllers. One adapter is a hypothetical seam.
The split also forced `GET /watchlist` to live apart from the writes it reads back,
because putting it with them would have made `title → engagement → title`.

## Decision

`TitleRating`, `TitleReaction` and `WatchlistItem` are served by `title/`. The two
modules are gone; their routes are on `TitleController` and their logic is on
`TitleService`.

The response carries one block instead of two:

```
engagement: {
  averageScore, ratingCount, likes, dislikes, watchlistCount,
  viewer: { score, reaction, inWatchlist } | null
}
```

`GET /title/:id/rating` is gone — it answered with the same data, from the same
tables, under a second cache key. The writes keep their own URLs, because they are
genuinely different actions, and all of them return the merged block.

`comment/` stays its own module. Nothing imports it, it is a paginated thread rather
than an aggregate, and it shares no consumer with the rest. Its one cross-domain
read — the comment author's own score, from `titleRating` — stays a direct read-only
query rather than becoming a `comment → title` dependency.

The tables are untouched. ADR-0003 stands.

## Consequences

- One aggregate round trip per read instead of two, one densification instead of two,
  one cache key instead of two. The client's `title-rating` slice merged into
  `title-engagement` for the same reason.
- The viewer's score moved inside the `viewer` envelope. As a flat `myScore` it had
  to mean both "has not rated" and "anonymous", and the client could not tell a
  control that should render as not-yet-set from one that should render as unknown.
- `title.service.ts` is around 700 lines and `title.controller.ts` around 360. This
  is the cost, and it was taken deliberately: a sub-module under `title/` would have
  kept the files small but reintroduced the indirection the merge was for.
  **A future architecture review will see a large service and want to split it
  again — that is this record's purpose.** Split it by a different cut if you must,
  but not back into a module whose only consumer is this one.
- The two controller specs merged into `title.controller.viewer.spec.ts`, keeping the
  cases that check the viewer value arrives and dropping the ones that only checked
  decorator pairing, which `auth/viewer-pairing.spec.ts` now covers on every route.
