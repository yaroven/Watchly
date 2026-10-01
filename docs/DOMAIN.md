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

## Four engagement concepts — deliberately separate

They look mergeable. They are not:

| Model | Shape | Question it answers |
| --- | --- | --- |
| `TitleRating` | one `score` per user per title, mutable | how good is it |
| `TitleReaction` | `LIKE` / `DISLIKE`, one per user per title | did I enjoy it |
| `TitleComment` | free text, many per user per title | what do I have to say |
| `WatchlistItem` | one per user per title | do I intend to watch it |

Rating and comment are split so that "I rated it, I have nothing to say" is
expressible, and so replies don't carry a mostly-null score column.

Watchly's own score is the **mean of `TitleRating`, computed per request** — it is not
stored. A cached average would be one more thing to drift.

The three one-per-viewer tables enforce it in the database (`@@unique([titleId, userId])`
and friends), so double voting is unrepresentable rather than merely discouraged.
`TitleComment` has no such constraint and cannot: many comments per viewer is the point.
Switching sides on a reaction updates the row; sending the vote you already cast
withdraws it.

## Comments

One level of threading: a comment either belongs to a title (`parentId` null) or replies
to one that does. **The column allows arbitrary depth and the service refuses it** — so
the rule can be relaxed later without a migration. `CommentReaction` and `CommentReport`
are unique per comment per user.

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
- Back-relation fields (`Title.watchlistEntries`, `Title.reactions`) exist only because
  Prisma requires both sides of a relation to be declared. No query reads them; counts
  go through `groupBy`.
- `Title_name_trgm_idx` is a hand-written trigram index. `prisma migrate diff` does not
  know about it and emits a `DROP INDEX` for it in every generated migration — delete
  that line before committing.
