# Backend implementation plan

Companion to `apps/client/PLACEHOLDER_DATA_BACKEND_TODO.md`. That file lists every spot
on the client rendering mock data; this one turns those gaps (plus the Figma pages that
have no client feature at all yet — Artists, Blog, Article) into a backend build order.

Suggested order: Auth → Title fields/genres/cast → Reviews → Engagement → Photos →
Discover ranking → Artists → Blog/Article. The first five phases close almost everything
in the client TODO for existing pages; the last two are brand-new Figma pages with no
client feature yet either.

## Phase 0 — Auth (blocks everything else)

`User` model already exists (`email`, `password`, `role`), but there is no backend auth
module at all — no `AuthModule`, no JWT. Login/Register forms on the client only validate
locally (`LoginForm.tsx`, `RegisterForm.tsx` — see PLACEHOLDER comments).

- `AuthModule`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- JWT (access + refresh), bcrypt/argon2 for password hashing, `@nestjs/passport` guard
- `Role` guard (ADMIN/USER) for admin routes (`AdminHeader.tsx` currently hardcodes "Admin User")

Unblocks: reviews, watchlist, like/dislike, admin auth, Header notifications/avatar.

## Phase 1 — Title: missing fields & endpoints

`Title` currently has: `name, description, type, posterUrl, hlsUrl, transcodingStatus`.
Add:

```prisma
model Title {
  // ...existing fields
  ageRating     String?
  runtime       String?
  country       String?
  releaseDate   DateTime?
  language      String?
  network       String?
  director      String?
  closedCaption String?
  trailerUrl    String?

  genres Genre[]      @relation("TitleGenres")
  cast   CastCredit[]
}

model Genre {
  id     String  @id @default(uuid())
  name   String  @unique
  titles Title[] @relation("TitleGenres")
}

model CastCredit {
  id       String @id @default(uuid())
  titleId  String
  title    Title  @relation(fields: [titleId], references: [id], onDelete: Cascade)
  artistId String
  artist   Artist @relation(fields: [artistId], references: [id])
  role     String // e.g. "Actor", "Character: Jon Snow"
}
```

Unblocks `TitleOverview`, `TitleInformation`, and the search filters that are currently
disabled in `SearchResults.tsx` (Director/Genre/Network/Country/Age rating).

Endpoints:

- `GET /titles/:id/similar` — recommendations / "more like this"
- `GET /genres` — genre list
- `GET /titles?genre=` — genre filter (extend `GetAllTitleDto`)
- IMDB-ranked sort — `sortBy=imdbScore` or a dedicated trending query param

## Phase 2 — Score / Rating

```prisma
model TitleScore {
  titleId        String @id
  title          Title  @relation(fields: [titleId], references: [id], onDelete: Cascade)
  imdb           Float?
  rottenTomatoes Int?
  metacritic     Int?
  tmovie         Float? // derived from Review.score
}
```

Or just plain fields on `Title` — simpler, recommended unless these need independent
update cadences.

## Phase 3 — Reviews / Comments (Title)

```prisma
model Review {
  id         String   @id @default(uuid())
  createdAt  DateTime @default(now())
  titleId    String
  title      Title    @relation(fields: [titleId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  score      Int
  text       String
  hasSpoiler Boolean  @default(false)
  parentId   String?
  parent     Review?  @relation("ReviewReplies", fields: [parentId], references: [id])
  replies    Review[] @relation("ReviewReplies")

  reactions ReviewReaction[]
  reports   ReviewReport[]
}

model ReviewReaction {
  id       String       @id @default(uuid())
  reviewId String
  review   Review       @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  userId   String
  type     ReactionType // LIKE / DISLIKE

  @@unique([reviewId, userId])
}

model ReviewReport {
  id       String @id @default(uuid())
  reviewId String
  review   Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  userId   String
  reason   String?
}
```

Endpoints:

- `GET /titles/:id/reviews` (paginated, sort newest/oldest/hottest)
- `POST /titles/:id/reviews`
- `POST /reviews/:id/reactions` (like/dislike, toggle)
- `POST /reviews/:id/report`

Unblocks `TitleReviews.tsx` + `CommentCard.tsx` (both have explicit PLACEHOLDER comments
pointing here).

## Phase 4 — Engagement (like/dislike/watchlist on Title)

```prisma
model TitleReaction {
  id      String       @id @default(uuid())
  titleId String
  userId  String
  type    ReactionType

  @@unique([titleId, userId])
}

model WatchlistItem {
  id        String   @id @default(uuid())
  userId    String
  titleId   String
  createdAt DateTime @default(now())

  @@unique([userId, titleId])
}
```

Endpoints:

- `POST /titles/:id/reaction`, `DELETE /titles/:id/reaction`
- `POST /titles/:id/watchlist`, `DELETE /titles/:id/watchlist`, `GET /users/me/watchlist`
- `GET /titles/:id/stats` — aggregate likes/dislikes/shares/watchlistCount

Unblocks `StreamFilmInfo.tsx` and the "My Watchlist" row on Discover.

## Phase 5 — Title photos

```prisma
model TitlePhoto {
  id        String   @id @default(uuid())
  titleId   String
  title     Title    @relation(fields: [titleId], references: [id], onDelete: Cascade)
  url       String
  createdAt DateTime @default(now())
}
```

- `GET /titles/:id/photos`
- `POST /titles/:id/photos/upload-url` (reuse the same S3 presigned-url pattern already
  used for poster/movie uploads)

Unblocks `StreamPhotos.tsx`.

## Phase 6 — Discover / editorial

- `Title.isFeatured: Boolean` + `featuredOrder: Int?` — replaces the hero carousel /
  spotlight fixtures
- `GET /titles?trending=true` — ranked by recent views (needs a view counter —
  `Title.viewCount`, incremented on playback)
- `GET /titles?sortBy=imdbScore&order=desc` — "IMDB Top"

Unblocks `DiscoverScreen.tsx` (every row currently reuses the same generic `useTitles()`
call — none are actually trending/genre/IMDB-ranked/personalized).

## Phase 7 — Artists (new feature, doesn't exist at all)

```prisma
enum ArtistRole {
  ACTOR
  ACTRESS
  DIRECTOR
  WRITER
  PRODUCER
  ADDITIONAL_CREW
}

model Artist {
  id        String       @id @default(uuid())
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  name      String
  bio       String
  photoUrl  String
  roles     ArtistRole[]

  gallery ArtistPhoto[]
  credits CastCredit[]
}

model ArtistPhoto {
  id       String @id @default(uuid())
  artistId String
  artist   Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  url      String
}
```

Endpoints (same pattern as `TitleController`):

- `POST /artists`, `GET /artists` (search/role filter/pagination), `GET /artists/:id`,
  `PATCH /artists/:id`, `DELETE /artists/:id`
- `GET /artists/:id/works` — from `CastCredit` (Phase 1)
- `GET /artists/:id/gallery`
- `GET /artists/:id/related-news` — depends on Phase 8 (Article tagged with the artist)

Unblocks the Artists Page + Single Artist Page (currently no route, no feature on the
client).

## Phase 8 — Blog / Article (new feature, doesn't exist at all)

```prisma
model Article {
  id          String    @id @default(uuid())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  title       String
  slug        String    @unique
  excerpt     String
  content     String    // markdown/html
  coverUrl    String
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  publishedAt DateTime?

  taggedArtists Artist[]         @relation("ArticleArtists")
  comments      ArticleComment[]
}

model ArticleComment {
  id        String           @id @default(uuid())
  articleId String
  article   Article          @relation(fields: [articleId], references: [id], onDelete: Cascade)
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  text      String
  createdAt DateTime         @default(now())
  parentId  String?
  parent    ArticleComment?  @relation("ArticleCommentReplies", fields: [parentId], references: [id])
  replies   ArticleComment[] @relation("ArticleCommentReplies")
}
```

Endpoints:

- `POST /articles`, `GET /articles` (paginated, for the Blog Page), `GET /articles/:id`,
  `PATCH /articles/:id`, `DELETE /articles/:id`
- `GET /articles/:id/comments`, `POST /articles/:id/comments` (the reactions/report
  pattern from Phase 3 can be genericized and reused here)
- `GET /articles/:id/recommended` — "Recommended Reads" section on the Article Page
- The Discover "News" rail (`DiscoverScreen/mocks.ts` `news` fixture) is fed by this too —
  `GET /articles?limit=&sort=recent`

Unblocks the Blog Page, the Article Page, and the "News" fixture on Discover.
