# Placeholder data — backend work needed

Client-side inventory of every spot rendering mock/hardcoded data instead of a real
backend response. Each item is marked `PLACEHOLDER:` inline in the source. Delete the
checklist item (and the mock it points to) once the backend piece lands.

## Title Overview / Information (Film page)

- [ ] **`features/title/components/TitleOverview/mocks.ts`** (whole file, `TEMPORARY`) —
      `getTitleOverviewFixture()` fakes: genres, scores (IMDB/RT/Metacritic/T.Movie), the
      info-table metadata (age rating, runtime, country, release date, language, network,
      director, closed caption), cast, reviews, and stream stats (likes/dislikes/shares/
      watchlist count/photos). Consumed by `TitleOverview`, `TitleInformation`,
      `StreamFilmInfo`, `StreamPhotos`, `TitleReviews`, `EpisodeList`,
      `StreamEpisodesSidebar`.
      Needs on `Title`: `genres: string[]`, `scores: {imdb, rottenTomatoes, metacritic,
  tmovie}`, `ageRating`, `runtime`, `country`, `releaseDate`, `language`, `network?`,
      `director`, `closedCaption`, `cast: {name, avatarUrl}[]`, `trailerUrl?`.
      Backend ready: `GET /titles/:id/comments` (paginated) and
      `GET /titles/:id/engagement` (`likes`, `dislikes`, `watchlistCount`, `avgScore`,
      `ratingCount`). Still missing: `shares`, and a photos gallery
      (`GET /titles/:id/photos`).

- [ ] **`TitleOverview.tsx`** — "Watch Trailer" button has no `onClick`; `Title` has no
      `trailerUrl` field to link to.

- [ ] **`features/title/components/DiscoverScreen/mocks.ts`** (whole file, `TEMPORARY`) —
      hero carousel (`heroSlides`), news rail (`news`), and spotlight grid (`spotlight`)
      are all fixtures. Needs: a curated/editorial-hero endpoint, a news/articles endpoint,
      and a spotlight-picks endpoint (or an admin-configurable "featured" flag on `Title`).

- [ ] **`features/title/components/DiscoverScreen/mocks.ts`** `moreLikeThis` — used by
      `TitleMoreLikeThis`, extends `Title` with `rating` and `genres` that don't exist on
      the real type. Needs a `GET /titles/:id/similar` (or `/recommendations`) endpoint
      returning titles with those fields.

- [ ] **`DiscoverScreen.tsx`** — "Trending movies", "Trending series", "Genres", "IMDB Top
      Movies", "IMDB Top Series", "Trending TV Shows", and "My Watchlist" rows all reuse the
      exact same generic `useTitles()` result — none of them are actually trending/genre/
      IMDB-ranked/personalized queries. Needs dedicated endpoints or query params:
      trending (by recent views), genre filter, IMDB-ranked sort, and a per-user watchlist
      endpoint.

## Reviews / Comments

- [ ] **`TitleReviews.tsx`** `handleSubmit` — posting a review only appends to local React
      state; nothing is persisted, and author/avatar are hardcoded to `"You"` /
      a picsum URL. Backend ready: `POST /titles/:id/comments`, which answers with the
      author and their avatar URL. Still needs a real signed-in user on the client.
- [ ] **`CommentCard.tsx`** — like/dislike counters and the reply-count toggle are local
      state only; nothing persists. Backend ready:
      `POST|DELETE /reactions/comments/:id` for the vote, `GET /comments/:id/replies`
      for the toggle.
- [ ] **`CommentCard.tsx`** — "Report" button has no handler. Backend ready:
      `POST /comments/:id/report`.

## Stream page (video player)

- [ ] **`StreamFilmInfo.tsx`** — like/dislike reaction and "Add to Watchlist" toggle are
      local state only; nothing is persisted or fetched as an initial value. Backend
      ready: `POST|DELETE /reactions/titles/:id`, the watchlist routes, and
      `GET /titles/:id/engagement`, whose `viewer` object carries the caller's own
      reaction and watchlist state — `null` when nobody is signed in, which is not the
      same as "has not voted". The component still needs wiring.
- [ ] **`StreamFilmInfo.tsx`** — score badge falls back to a hardcoded `9` when no
      `rating` prop is passed (only used when the T.Movie score mock is unavailable —
      resolved once real scores exist).
- [ ] **`StreamPhotos.tsx`** — "Add Photo" button has no handler. Needs a photo-upload
      endpoint.

## Admin

- [ ] **`AdminHeader.tsx`** — profile card hardcodes `"Admin User"` / `"Super Admin"`.
      There is no auth/session system on the client at all (`grep` for
      `useCurrentUser`/`useAuth`/`useSession` turns up nothing). Needs a real
      authenticated-admin-user endpoint.
- [ ] **`shared/ui/Header/Header.tsx`** (main site header) — user avatar hardcodes an
      external placeholder image URL, and `Notification` always renders
      `hasNotifications={false}`. Needs the same auth/session work as above (name +
      avatarUrl) plus a notifications endpoint.

## Not a placeholder (checked, already real)

- `Title`, `Episode`, `Season` schemas (`features/*/schemas/*.ts`) — genuinely minimal;
  everything they're missing is listed above, nothing extra assumed.
- `DiscoverScreen`'s `Catalog` "Recommended for you" row — real data from `useTitles()`.
- Episode thumbnails (`getEpisodeThumbnail`) and scores (`getEpisodeScore`) already fall
  back sanely (poster image, deterministic placeholder score) and are covered by the
  `TitleOverview/mocks.ts` entry above — not separately listed.
