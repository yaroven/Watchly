# Domain model

Source of truth is `apps/api/prisma/schema.prisma`. This file covers the shape and the
distinctions that are easy to get wrong; the schema holds the detail.

## Catalogue

`Title` is the root for both films and series (`type: MOVIE | SERIES`). A series hangs
`Season` off it, and each season hangs `Episode`. `Genre` is many-to-many with `Title`.
`Artist` links to `Title` through `CastCredit`, which carries `character` and `order`.

External scores live in `ExternalRatings`, one row per title per source (IMDB,
METACRITIC, ROTTEN_TOMATOES). `votesCount` is nullable because only IMDb exposes one
through OMDb. `TitleExternalId` maps a title to its id at each source.

## Four engagement concepts — four tables, two modules

They look mergeable as *tables*. They are not:

| Model | Shape | Question it answers |
| --- | --- | --- |
| `TitleRating` | one `score` per user per title, mutable | how good is it |
| `Reaction` | `LIKE` / `DISLIKE`, one per user per subject | did I enjoy it |
| `Comment` | free text, many per user per thing | what do I have to say |
| `WatchlistItem` | one per user per title | do I intend to watch it |

Rating and comment are split so that "I rated it, I have nothing to say" is
expressible, and so replies don't carry a mostly-null score column.

The *modules* do not follow the tables one-to-one. `TitleRating`, `Reaction`
and `WatchlistItem` are served by `title/` as one `engagement` block, because every
consumer that wants one wants the rest and there was exactly one caller between
them. `Comment` is still its own module — it is a paginated thread rather than an
aggregate. `TitleModule` imports it for one reason only: deleting a title has to take
its threads, which no longer cascade. See ADR-0011 and ADR-0013.

Watchly's own score is the mean of `TitleRating`, cached on `TitleEngagement` with the
rating and watchlist counts. Likes, dislikes and comment counts are cached separately on
`EngagementCounters`, one row per subject, because every kind of thing can have those
and only a title has a score — see ADR-0014 and ADR-0015. Both cached rows are
relations, so a read loads them with the subject. Nothing aggregates them per read:
`EngagementCountersService` recomputes a row inside the transaction that changed the
rows it summarises.

The three one-per-viewer tables enforce it in the database (`@@unique([titleId, userId])`,
and `@@unique([entityType, entityId, userId])` for reactions), so double voting is
unrepresentable rather than merely discouraged.
`Comment` has no such constraint and cannot: many comments per viewer is the point.
Switching sides on a reaction updates the row; sending the vote you already cast
withdraws it.

## Comments

One level of threading: a comment hangs off a title (`titleId`) or off the comment it
answers (`parentId`). **The arc allows arbitrary depth and the service refuses it** — so
the rule can be relaxed later without a migration. A reaction on a comment is a
`Reaction` row with `commentId` set; a report is a `Report` row, which only comments have.
Both are unique per person per subject.

## Users

`role: ADMIN | USER`. `displayName` and `avatarKey` are nullable because every account
that already existed predates them; the API falls back to the email local part — never
the address itself, which is not the commenter's to publish.

`avatarKey` holds an object key in the processed bucket, **not a URL**. A presigned URL
stored in a row outlives its own expiry; the URL is derived on read instead. One avatar
per user is a consequence of the key shape, `avatars/<userId>/<uploadId>.webp`: attaching
a new one deletes the superseded object in the same step.

## Transcoding

`TranscodingStatus` (PENDING / PROCESSING / COMPLETED / FAILED) lives on both `Title` and
`Episode`. `VideoTranscodingProgress` is a 0-or-1 row attached to either one, holding the
percentage the client polls.

## Conventions

- Primary keys are `String @id @default(uuid())`.
- Child rows cascade on parent delete.
- `createdAt @default(now())` + `updatedAt @updatedAt` on most tables.
- Back-relation fields (`Title.watchlistEntries`, `User.reactions`) exist only because
  Prisma requires both sides of a relation to be declared. No query reads them; counts
  go through `groupBy`.
- `Reaction`, `Comment` and `EngagementCounters` hang off their subject by **one
  nullable foreign key per kind** — an exclusive arc — rather than a polymorphic
  `(entityType, entityId)` pair, so the cascade rule holds for them like anywhere else.
  Exactly one arc is set, which is a `CHECK` constraint: `Reaction_one_subject`,
  `Comment_one_subject`, `EngagementCounters_one_subject`. See ADR-0015.
- **Hand-written SQL that `prisma migrate diff` does not manage**: the three CHECKs
  above, and `Title_name_trgm_idx`. Generated migrations neither create nor drop the
  CHECKs; the trigram index they try to drop every time (delete that line).
- `Title_name_trgm_idx` is a hand-written trigram index. `prisma migrate diff` does not
  know about it and emits a `DROP INDEX` for it in every generated migration — delete
  that line before committing.
