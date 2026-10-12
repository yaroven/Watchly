# apps/api

NestJS 11, Prisma + Postgres, BullMQ on Redis, AWS SDK v3 for S3/SQS. Two entrypoints
from one codebase and one Dockerfile: `src/main.ts` (HTTP, port 3000) and
`src/worker-main.ts` (transcoding worker). `README.md` here is `nest new` boilerplate —
ignore it.

## Layout

One directory per domain under `src/`, each with `*.module.ts`, `*.controller.ts`,
`*.service.ts` and `dto/request` + `dto/response`, and in most cases a
`*.service.spec.ts` (`artist` and `external-ratings` predate that and have none;
`external-ratings` has no `dto/request` either):

`artist` `comment` `episode` `external-ratings` `genre` `season` `title` `title-cast`
`user` `watchlist`

Infrastructure: `auth`, `prisma`, `s3`, `s3-event`, `media-asset`, `poster`,
`video-transcoder`, `config` (typed `registerAs` factories), `common` (pagination,
shared DTOs, `utils/`).

Anything in a domain that is not a module, controller, service or DTO goes in that
domain's `utils/` — Prisma query shapes (`*.query.ts`), existence guards
(`assert-*.util.ts`) and the pipes over them (`*-exists.pipe.ts`).
`src/common/utils/` holds the cross-domain versions. Files carry their kind as a
suffix: `.util.ts`, `.query.ts`, `.pipe.ts`, `.decorator.ts`, `.const.ts`, `.enum.ts`,
`.types.ts`.

A route whose only domain-specific work is "does this id exist" takes an existence
pipe on the param (`TitleExistsPipe`, `EpisodeExistsPipe`, `SeasonExistsPipe`, each in
its domain's `utils/`) instead of a service method that wraps the check, and then
belongs with the service that owns the mechanics: that is why the movie and episode
upload/transcode routes live on `media-asset/{title,episode}-media.controller.ts` and
both poster upload URLs on `poster/title-poster.controller.ts`, each injecting one
service. The episode's playback URL is the counter-example that stayed behind —
building it needs the episode's season and title, which only `EpisodeService`
resolves.

The engagement writes and the watchlist toggles carry it too, and dropped their own
`assertTitleExists(tx, …)` when they did: a missing title cannot slip past, because
the summary read that closes each transaction (`readEngagement`) refuses on the same
row and rolls the write back, and the FK on `titleId` would reject it regardless. The
leading check only bought failing _before_ the write instead of after it — one query
per write on the hot path. `update` is the exception that keeps its own check, because
it also needs the `P2025` re-read to tell "title gone" (404) from "bad genreId" (400).

Nothing closes the window between the pipe and the write — a `findUnique` takes no
lock, so the in-transaction check never did either. A title deleted mid-request ends
as a rollback, not a bad row.

## Rules

- Every request body and query needs a class-validator DTO. The global `ValidationPipe`
  runs with `whitelist` and `forbidNonWhitelisted`, so an undecorated field is rejected.
  Don't read raw `@Body()` objects.
- Read config through `ConfigService` with the tokens in `src/config/`, not
  `process.env`. `main.ts` is the one exception and it goes through
  `requireInProduction()`.
- Controllers carry Swagger decorators — `@ApiOperation`, the response type, **and the
  error responses the route can actually emit**. A route documenting only 200 is wrong.
- Use the injected pino logger, never `console.log`.

### Viewer identity

- Behind `@Auth()` / `@AdminOnly()`, take the viewer with `@CurrentUserId(): string`.
  Behind `@OptionalAuth()`, use `@OptionalUserId(): string | undefined`. Never `userId!`.
- The reason is not style: **Prisma reads `undefined` in a `where` as "no filter"**, so
  `deleteMany({ where: { titleId, userId: undefined } })` deletes every user's row and
  answers 200. The decorator is what keeps `undefined` out of that position.
- `@CurrentUserId()` on an `@OptionalAuth()` route compiles and 500s every anonymous
  caller. **`auth/viewer-pairing.spec.ts` checks this on every route there is** — it
  walks the route metadata of every `*.controller.ts`, so a route added tomorrow is
  covered the moment its file lands. Nothing to remember when adding one.
- That spec checks the pairing, not the value. That the viewer actually _arrives_ is
  pinned by supertest in `title.controller.viewer`, `watchlist.controller` and
  `title-watchlist.controller` — including the case that matters most, a withdrawal
  refusing to run without a viewer filter rather than deleting everyone's row.

### Responses that depend on who is asking

- A field that is "unknown" must not serialise the same as "no". `TitleEngagementDto`
  carries `viewer: { myReaction, inWatchlist } | null`, where `null` means _nobody was
  in scope_ (anonymous caller, or a server-side render). A viewer who simply has not
  voted is a non-null object. Collapsing those two makes the client render a confident
  falsehood — and, on a toggle endpoint, undo the thing the user meant to keep.
- Aggregate helpers (`summarizeMany` on ratings and engagement) return **one entry per
  requested id**. `groupBy` only answers for rows that exist, so densify before
  returning. Callers treat a map miss as a broken invariant and throw.
- Pass `viewerId` explicitly, including when it is `null`. Don't let it default.

### Errors

- A missing title is `NotFoundException` on every route, including writes. The request
  was well-formed; the resource is gone.
- `@OptionalAuth()` never answers 401 — not for a rejected token, not for a strategy
  failure. These routes serve public pages and the client turns a 401 into
  refresh-then-redirect-to-login, so a 401 here ejects a viewer off a page they were
  entitled to see. The rejection is logged instead.

## Tests

Jest, `rootDir: src`, `*.spec.ts` beside the unit under test. No coverage floor is
enforced and specs are excluded from ESLint and from `tsconfig.build.json` — which is
why `tsconfig.spec.json` exists: it is the project that covers them, so an editor
resolving a spec against the build config does not report it as orphaned. `src/jest.d.ts`
references the jest types explicitly rather than relying on `@types/*` auto-discovery.

Routes that read the viewer need a **request-level** spec (supertest +
`overrideGuard`), not a handler call — see the four named above. A direct call never runs the param decorator, so it cannot tell
`@CurrentUserId()` from a hardcoded value.

**Write the test so it can fail.** Before trusting a new test, break the behaviour it
names and confirm _that_ test goes red. The ones that have slipped through here:

- Mocking `$transaction` as `(fn) => fn(prismaMock)` makes the transaction client and
  the base client the same object, so "it runs in a transaction" asserts nothing. Give
  the transaction its own mock and assert the writes landed on it.
- Hard-coding a `deleteMany` row count makes the `where` clause irrelevant — the test
  passes whatever you filter on. Model the row instead.
- `toHaveBeenCalledWith(id, undefined)` is right for an anonymous caller on an
  `@OptionalAuth()` route and wrong as the _only_ case — assert the signed-in one
  beside it, or nothing notices the controller dropping the viewer on the floor.
- Param decorators don't execute on a direct method call. Viewer propagation needs a
  request-level test (supertest + `overrideGuard`), not a handler call.
