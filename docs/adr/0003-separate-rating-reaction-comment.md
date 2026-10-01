# ADR-0003 — Score, reaction and comment are three tables

**Status:** accepted

## Context

The original plan (`apps/api/BACKEND_TODO.md`, phase 3) modelled a single `Review`
carrying both a score and text.

## Decision

Three separate models, plus a fourth axis for intent:

- `TitleRating` — one mutable score per user per title
- `TitleReaction` — `LIKE`/`DISLIKE`, one per user per title
- `TitleComment` — free text, many per user per title
- `WatchlistItem` — one per user per title

The schema states the distinction directly: the score says how good it is, the reaction
says whether the viewer enjoyed it.

## Consequences

- "I rated it and have nothing to say" is expressible; under the combined model it was
  not.
- Replies don't carry a mostly-null score column.
- Watchly's own score is the average of `TitleRating`, computed per request rather than
  stored — a cached aggregate would be one more thing to drift.
- A title detail response assembles three aggregates instead of reading one row. Each
  returns one entry per requested id so a map miss stays a bug, not a silent zero.
