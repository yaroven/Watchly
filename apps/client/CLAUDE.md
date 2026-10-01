# apps/client

Next.js 16 App Router, React 19, MUI + Emotion, TanStack Query, zustand, zod,
react-hook-form, hls.js. Dev server on port 4000. `README.md` here is
`create-next-app` boilerplate — ignore it.

**There is no test runner in this app.** No jest, no vitest, no testing-library, no
playwright — 365 source files, zero specs. `pnpm lint` and `next build` are the only
gates, and neither runs in CI as a lint. Verify behaviour in the browser and say so.

## Layout

- `app/` — routing only: `(auth)/`, `(main)/discover`, `(main)/title`,
  `(main)/watchlist`, `(admin)/admin`. Pages compose features and stay thin. An ESLint
  rule rejects any file here that is not a recognised App Router filename.
- `features/<domain>/` — the real code: `api/` (service + query keys + hooks),
  `components/`, `schemas/` (zod), `index.ts` as the public surface. Slices: `admin`
  `artist` `auth` `comment` `episodes` `genre` `player` `season` `title`
  `title-engagement` `title-rating` `transcoding` `user`.
- `shared/` — `api/` (axios instance and the auth plumbing), `lib/`, `mui/` (theme
  tokens), `ui/`, `assets/`.

Layer rules are ESLint-enforced: `shared/**` may not import `features/*` or `app/*`, and
`features/**` may not import `app/*`. Cross-feature access goes through the other
feature's `index.ts`, never into its internals.

## Rules

- Server state is TanStack Query; client-only state is zustand. Fetched data does not go
  in zustand.
- Import a feature through its `index.ts`, not by deep path.
- MUI: use theme tokens from `shared/mui/theme` (`tokens`, `inputVariants`) rather than
  raw hex. There is a sass dependency but it is not the styling path.
- New remote image hosts go in `next.config.ts` **and** `.env.example`.

### Anything that depends on who is viewing

This is where the bugs have been. The rules exist because each was broken:

- **Viewer identity belongs in the cache key.** A title response carries that viewer's
  own `engagement`, so `titleKeys.listFor(params, viewerKey)` /
  `detailFor(id, viewerKey)` are the query keys; the bare `listPrefix` / `detailPrefix`
  rungs are for invalidation only. `ViewerKey` is branded so only `useViewer()` can mint
  one. Without this, the request that goes out during the boot exchange is anonymous,
  answers **200** (not 401, these routes are `@OptionalAuth()`), and caches "not on your
  watchlist" for everyone for a full staleTime.
- `useViewer()` returns a union: `pending` | `anonymous` | `signed-in`. They are not
  interchangeable. A control disabled on "not signed in" during `pending` is disabled
  for someone who _is_ signed in; one dimmed on `pending` alone is bright and dead for
  someone who is not.
- **`engagement.viewer === null` means unknown, not "no".** Server-rendered payloads
  carry no bearer token, so they can never know. Don't coerce it with `?? false` — show
  an indeterminate control and disable the toggle. The server toggles, so acting on a
  wrong assumption _withdraws_ the like the viewer wanted to keep.
- A failed refetch leaves stale-but-present data: `isError` stays false. Check
  `failureCount` too where stale viewer state is dangerous.
- A failed mutation is invisible by default — every control renders from server values,
  so a rejected click looks identical to no click. Pass `onError` and show something.
  `createMutationHook`'s mutation cache only logs to the console.

### Auth plumbing (`shared/api/axios.ts`)

The request interceptor refreshes an expired access token **before** sending it, because
`@OptionalAuth()` routes answer a dead token with 200-anonymous and no 401 would ever
arrive to trigger a retry. Two invariants there, both of which were violated once:

- Only a **401 from `/auth/refresh`** clears the session. A timeout, a 5xx or a 429 must
  not — clearing on any failure signs a viewer out over a dropped packet.
- A token minted moments ago that already reads expired means this device's clock is
  wrong; the proactive path switches itself off for the session rather than refreshing
  on every request forever.

## Placeholder data

`PLACEHOLDER_DATA_BACKEND_TODO.md` tracks what is still hardcoded. `features/title/
components/TitleOverview/mocks.ts` is the remaining fixture file — its header lists
every importer, including one in another feature. Update both when you replace a
placeholder.
