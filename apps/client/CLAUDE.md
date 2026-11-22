# apps/client

Next.js 16 App Router, React 19, MUI + Emotion, TanStack Query, zustand, zod,
react-hook-form, hls.js. Dev server on port 4000. `README.md` here is
`create-next-app` boilerplate — ignore it.

Tests are **vitest, unit only** (`pnpm --filter client test`, run in CI by Build Client).
Coverage is thin and deliberate: the auth plumbing in `shared/` and the JWT helpers,
because they are module-level state that no type can hold, and what a mutation does to
the cache — `catalogue-copies` (which cached reads hold a copy of a title or genre, so
which keys a write refreshes, checked with TanStack's own `partialMatchKey`),
`localized-reads` and `content-translations` (every localized read keys and fetches in
the same language, and every write reaches it in both), `comment-reaction.cache` (how a
comment vote is written into the lists and replies) and `viewer-control` (what an
engagement control does for each viewer state). Keep that logic in pure functions beside
the hook, not inside `onSuccess`, so it stays testable without a DOM. There is no DOM environment
and no component test yet, so behaviour in a component is still verified in the browser —
say so when you do.

## Layout

- `app/` — routing only, every route under `[locale]/` (`en`, `uk`): `(auth)/`,
  `(main)/discover`, `(main)/title`, `(main)/watchlist`, `(admin)/admin`. Pages compose
  features and stay thin. An ESLint rule rejects any file here that is not a recognised
  App Router filename.
- `i18n/` + `messages/{en,uk}.json` — next-intl. User-facing text goes through
  `useTranslations` / `getTranslations`, never a literal; add the key to both files.
  Navigate with `Link` / `usePathname` / `useRouter` from `@/i18n/navigation`, which
  strip and add the locale prefix.
- `features/<domain>/` — the real code: `api/` (service + query keys + hooks),
  `components/`, `schemas/` (zod), `index.ts` as the public surface. Slices: `admin`
  `artist` `auth` `comment` `episodes` `feature-flags` `genre` `player` `season` `title`
  `title-engagement` `transcoding` `user`.
- `shared/` — `api/` (axios instance and the auth plumbing), `lib/`, `mui/` (theme
  tokens), `ui/`, `assets/`.

Layer rules are ESLint-enforced: `shared/**` may not import `features/*` or `app/*`, and
`features/**` may not import `app/*`. Nothing enforces the feature-to-feature direction.
Every slice has an `index.ts`; import another feature through it. The deep imports left
are deliberate and point at leaf modules only — `title/api/catalogue-copies` and the key
files it reads, and `title-engagement` reaching `title/api/title.service` and
`title/schemas` — because `title` and `title-engagement` import each other and a barrel
on either side would make that a load-order cycle.

## Rules

- Server state is TanStack Query; client-only state is zustand. Fetched data does not go
  in zustand.
- MUI: use theme tokens from `shared/mui/theme` (`tokens`, `inputVariants`) rather than
  raw hex. There is a sass dependency but it is not the styling path.
- New remote image hosts go in `next.config.ts` **and** `.env.example`.
- **Feature flags come from the api, never from env.** `GET /feature-flags` is the only
  source; there is no `NEXT_PUBLIC_FF_*` and must not be one, since that is baked at
  build time and would be a second source of truth against the api's own gate. Read a
  flag through `useFeatureFlag("reactions")` from `features/feature-flags`, or wrap the
  control in `<FeatureGate flag="...">`. The hook is `false` until the api has answered
  `true`: while the snapshot loads, on a failed fetch, and for a key the api did not
  send. Off until proven on, the same default the api evaluates with, so a gated
  control never renders before the answer. The snapshot is viewer-keyed like every
  other viewer-dependent read, because the api resolves flags per caller.

### Anything that depends on who is viewing

This is where the bugs have been. The rules exist because each was broken:

- **Viewer identity belongs in the cache key.** A title response carries that viewer's
  own `engagement`, so `titleKeys.listFor(params, viewerKey)` /
  `detailFor(id, viewerKey)` are the query keys; the bare `listPrefix` / `detailPrefix`
  rungs are for invalidation only — the `*Prefix` naming is what marks them, since a
  prefix is structurally still a valid query key. The `ViewerKey` brand does enforce that
  a complete key cannot be built from a bare string. Without this, the request that goes out during the boot exchange is anonymous,
  answers **200** (not 401, these routes are `@OptionalAuth()`), and caches "not on your
  watchlist" for everyone for a full staleTime.
- `useViewer()` returns a union: `pending` | `anonymous` | `signed-in`. They are not
  interchangeable. A control disabled on "not signed in" during `pending` is disabled
  for someone who _is_ signed in; one dimmed on `pending` alone is bright and dead for
  someone who is not. Don't derive this per component: `viewerControl` in
  `shared/lib/viewer-control` turns the viewer, whether their own value is known, a
  failed refresh and an in-flight write into `disabled` / `dimmed` / `intent`
  (`write` | `sign-in` | `ignore`), and `nextVote` turns a click into the absolute vote.
  Read identity through `useViewer()`, not `useAuthStore` — `Boolean(userId)` reads
  `pending` as signed out.
- **`engagement.viewer === null` means unknown, not "no".** Server-rendered payloads
  carry no bearer token, so they can never know. Don't coerce it with `?? false` — show
  an indeterminate control and disable the toggle. Reacting is **absolute** now
  (`PUT|DELETE /reactions/:entityType/:entityId`, ADR-0016): the request names the vote
  the viewer should end up holding, so the client has to know what they hold before it
  can know what a click means. It no longer risks withdrawing a like by accident, as it
  did while the server inferred the toggle — it simply cannot tell `DELETE` from `PUT`
  without that state.
- **A watchlist item is a `CardTitle`, not a `Title`.** `GET /watchlist` sends no
  `engagement.viewer.reaction`, because the api skips the vote cache for cards. `TitleCard`
  and `Catalog` take `CardTitle`, which every title read also fits; don't widen a watchlist
  item back to `Title` or read a vote from it.
- A failed refetch still sets `isError`: query-core moves the query to `status: "error"`
  whether or not it already holds data (that is what `isRefetchError` is derived from).
  Don't reach for `failureCount` — it is also non-zero mid-retry on a fetch that will
  succeed, which disables controls for no reason.
- A failed mutation is invisible by default — every control renders from server values,
  so a rejected click looks identical to no click. Pass `onError` and show something —
  the QueryClient's mutation cache logs every failure but shows the viewer nothing. An
  app-level surface reading from that cache is still missing.

### Anything that depends on the language asked for

Catalogue content (title, season, episode and genre names and descriptions, cast
characters) comes back in the language of `Accept-Language`, with English as the base and
the fallback. Every localized entity carries `content: { locale, fallback }`.

- **The content locale belongs in the cache key**, beside the viewer key. A localized read
  is a `LocalizedRead` (`<slice>/api/<slice>.reads.ts`): one `key({ locale, viewerKey })`
  and one `fetch(locale)`, run by `useLocalizedQuery` (`shared/api/localized-query`),
  which resolves the locale once and hands the same value to both. Don't build a full key
  or call a localized service from a hook by hand — that is how a key and a request end
  up in different languages. Otherwise a language switch serves the cached answer in the
  old language. The `*Prefix` rungs writes invalidate carry no locale, so one write
  refreshes every language; in every slice a bare rung is named `*Prefix`.
- **Admin edit screens pin English.** They edit the base content, and a form filled from a
  translation would save it back as English. The admin title, create-title and genre
  routes wrap their screen in `<BaseContentScope>`, and every localized read under it
  resolves to English; the admin title page fetches with `BASE_CONTENT_LOCALE` on the
  server. A read that needs another language there names it with `{ contentLocale }`.
  Admin lists (titles, dashboard) are not scoped and follow the page language. The api
  answers every write in English for the same reason. The axios interceptor keeps a
  caller's own `Accept-Language`, which is what makes the pin work on `/uk/admin`.
- **Translations are one module.** Each translated entity has a `TranslatableContent`
  descriptor (`<slice>/api/<slice>.translations.ts`: fields with limits, message
  namespace, service calls, and the `copies` a write refreshes), and
  `ContentTranslationEditor` runs the load / save / remove / feedback cycle for any of
  them. A new translated entity is a new descriptor, not a new editor.
- **A cast save replaces every credit**, so the cast manager resends each credit's
  `characterTranslations` on every save; dropping them wipes the translations.

### Auth plumbing (`shared/api/axios.ts`)

The request interceptor refreshes an expired access token **before** sending it, because
`@OptionalAuth()` routes answer a dead token with 200-anonymous and no 401 would ever
arrive to trigger a retry. Two invariants there, both of which were violated once:

- Only a **401 from `/auth/refresh`** clears the session. A timeout, a 5xx or a 429 must
  not — clearing on any failure signs a viewer out over a dropped packet.
- A failed refresh pauses the pre-emptive path for a bounded window, and the window
  pauses the reactive retry too. While it is open the viewer reads as signed-out on
  public routes — bounded, not removed, so keep the windows short.
- Expiry is measured against the server's `Date` header, not this device's clock. A
  machine an hour fast would otherwise read every token as expired and refresh on every
  request forever.

## Placeholder data

Two fixture files are left, both inside `title`: `components/TitleOverview/mocks.ts`
(stream photos, read by `StreamPhotos`) and `components/DiscoverScreen/mocks.ts` (the
news rail). The public cast is the real localized read. Delete a fixture when its screen
gets a backend.
