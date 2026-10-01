# apps/api

NestJS 11, Prisma + Postgres, BullMQ on Redis, AWS SDK v3 for S3/SQS. Two entrypoints
from one codebase and one Dockerfile: `src/main.ts` (HTTP, port 3000) and
`src/worker-main.ts` (transcoding worker). `README.md` here is `nest new` boilerplate —
ignore it.

## Layout

One directory per domain under `src/`, each with `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `*.service.spec.ts`, and `dto/request` + `dto/response`:

`artist` `comment` `episode` `external-ratings` `genre` `season` `title`
`title-engagement` `title-rating` `user`

Infrastructure: `auth`, `prisma`, `s3`, `s3-event`, `media-asset`, `poster`,
`video-transcoder`, `config` (typed `registerAs` factories), `common` (pagination,
shared DTOs, `env.util.ts`).

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
  caller. The four controllers with a `*.controller.spec.ts` pin their own pairing
  through supertest; anywhere else, check it by hand.

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
enforced and specs are excluded from ESLint and from `tsconfig.build.json`.

Routes that read the viewer need a **request-level** spec (supertest +
`overrideGuard`), not a handler call — see `title.controller.viewer.spec.ts` and the
three controller specs. A direct call never runs the param decorator, so it cannot tell
`@CurrentUserId()` from a hardcoded value.

**Write the test so it can fail.** Before trusting a new test, break the behaviour it
names and confirm _that_ test goes red. The ones that have slipped through here:

- Mocking `$transaction` as `(fn) => fn(prismaMock)` makes the transaction client and
  the base client the same object, so "it runs in a transaction" asserts nothing. Give
  the transaction its own mock and assert the writes landed on it.
- Hard-coding a `deleteMany` row count makes the `where` clause irrelevant — the test
  passes whatever you filter on. Model the row instead.
- `toHaveBeenCalledWith(id, undefined)` pins the _absence_ of a viewer as the contract.
- Param decorators don't execute on a direct method call. Viewer propagation needs a
  request-level test (supertest + `overrideGuard`), not a handler call.
