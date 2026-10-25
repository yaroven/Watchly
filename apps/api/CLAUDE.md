# apps/api

NestJS 11, Prisma + Postgres, BullMQ on Redis, AWS SDK v3 for S3/SQS. Two entrypoints
from one codebase and one Dockerfile: `src/main.ts` (HTTP, port 3000) and
`src/worker-main.ts` (background worker). `README.md` here is `nest new` boilerplate —
ignore it.

## Layout

One directory per domain under `src/`, each with `*.module.ts`, `*.controller.ts`,
`*.service.ts` and `dto/request` + `dto/response`, and in most cases a
`*.service.spec.ts` (`artist` and `external-ratings` predate that and have none;
`external-ratings` has no `dto/request` either):

`artist` `comment` `episode` `external-ratings` `genre` `season` `title` `title-cast`
`user` `watchlist`

Infrastructure: `auth`, `prisma`, `redis`, `s3`, `s3-event`, `media-asset`, `poster`,
`video-transcoder`, `reaction-flush`, `vote-cache`, `metrics`, `worker` (the worker
process's root module, which belongs to no domain because it composes all of them),
`config` (typed `registerAs` factories), `common` (pagination, shared DTOs, `utils/`).

Anything in a domain that is not a module, controller, service or DTO goes in that
domain's `utils/` — Prisma query shapes (`*.query.ts`), existence guards
(`assert-*.util.ts`) and the pipes over them (`*-exists.pipe.ts`).
`src/common/utils/` holds the cross-domain versions. Files carry their kind as a
suffix: `.util.ts`, `.query.ts`, `.pipe.ts`, `.decorator.ts`, `.const.ts`, `.enum.ts`,
`.error.ts`,
`.types.ts`.

A route whose only domain-specific work is "does this id exist" takes an existence
pipe on the param — one per domain in its `utils/`, for titles, episodes, seasons,
artists, genres and users — instead of a service method that wraps the check. A route
that then does nothing but forward belongs with the service that owns the mechanics:
that is why the movie and episode upload/transcode routes live on
`media-asset/{title,episode}-media.controller.ts` and all three poster/photo upload
URLs on `poster/title-poster.controller.ts`, each injecting one service.

Because a pipe does not run on a direct handler call, the 404 it owns is pinned by a
request-level `*.controller.existence.spec.ts` beside the unit spec, not by it. The episode's playback URL is the counter-example that stayed behind —
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

Media conversion is split by **kind**, not by feature: `video-transcoder` is
parameterised by `VideoType`, `image-transcoder` by `ImageKind`. Adding a kind of
image means a profile in `image-profile.const.ts` and a `ProcessedImageAttacher` in
the owning feature — the attacher supplies the two things only that feature knows,
the processed key and the row to point at it. The worker wires the attachers, so
`image-transcoder` never imports a feature module.

**Each side is split the same four ways**, and the names line up on purpose:

|                   | image                      | video                        |
| ----------------- | -------------------------- | ---------------------------- |
| producer          | `ImageTranscodeScheduler`  | `VideoTranscodeScheduler`    |
| conversion        | `ImageTranscoderService`   | `HlsTranscoder`              |
| orchestration     | `ImageTranscoderProcessor` | `VideoTranscoderProcessor`   |
| the row it writes | the attachers              | `VideoTranscodeStateService` |

**Orchestration belongs to the processor**, not to a service beside it: the processor
owns the order of the stages and each stage's mechanics belong to someone else. That is
what keeps the conversion classes free of Prisma — `HlsTranscoder` takes `onProgress`
and `shouldAbort` as callbacks rather than injecting the state service, which makes it
the one piece of the video pipeline testable with no database mock at all.

**The api must not be able to reach ffmpeg.** `apk add ffmpeg` is in the `worker-base`
and `worker-runner` Docker targets only, so a module graph that pulls `fluent-ffmpeg`
into the api is importing a library whose binary is absent — it fails on use, not on
load, which is the worst way to find out. The api injects `VideoTranscodeScheduler`
(a `Queue`) and `VideoTranscodeStateService` (Prisma); neither imports ffmpeg, and
`VideoTranscoderModule` carries no `S3Module` for the same reason.

**A queue is registered by the transcoder that owns it, never by a feature.**
`VideoTranscodeScheduler.schedule`, `ImageTranscodeScheduler.schedule` and
`ReactionFlushScheduler.schedule` are the only producers — the third is not a
transcoder, but it follows the rule for the same reason. A feature injects the scheduler
and sees neither a `Queue` nor a job name: `reaction`, `title`, `season`, `artist`,
`poster` and `user-avatar` all do. `UserAvatarService` used to
hold an `@InjectQueue` of its own, which meant `UserModule` — and `AuthModule` behind it
— pulled a Redis queue in for a feature that only hands out an upload URL. `s3-event`
maps the raw key's kind to an `ImageKind` the same way it maps one to a `VideoType`, and
calls the producer; the dedup convention lives with the producer too, rather than once
per feature — `image-<rawKey>` as a `jobId`, and `vote-<arc>-<subjectId>-<userId>` as a
`deduplication.id` for a flush. **A flush must not set a `jobId`**: an explicit one is
checked for existence before BullMQ's deduplication runs, so it silently drops a vote
that arrives while the flush is being processed. `keepLastIfActive` is what makes that
vote raise a follow-up job instead.

The transcoding processors run in one worker process, beside
`ReactionFlushProcessor` — `worker-main.ts` loads `WorkerModule`
(`src/worker/worker.module.ts`), which registers both queues because converting an image
needs the ffmpeg the API image does not install. That module is the whole of the process
— anything the worker is to do has to be wired there — which is why it is named after
the process rather than after the video transcoder it started as. They keep **separate
queues** on purpose: concurrency is per-queue, and one setting cannot serve a
twenty-minute video transcode and an interactive 256px avatar. One queue for every image
is right for the opposite reason — an avatar and a poster cost about the same. What both
share lives in `common/utils/`: `DEFAULT_JOB_OPTIONS`, `withWorkDir`, `logJobFailure`,
`streamToFile`.

Every uploaded image goes through it: avatars, title and season posters, and artist
photos. `PosterService` presigns into the **raw** bucket, `poster-image.attacher.ts`
contributes one attacher per entity kind — three instances of one class, since only the
`ImageKind` differs between them, built in a factory because the entity kind is a
constructor argument rather than something DI resolves. The processed key is versioned
(`posters/<kind>/<id>/<version>.webp`) for the same reason an avatar's is: a stable key
would leave the superseded artwork in front of any viewer that cached it. Note that
`S3Service.uploadStream` sets no `Cache-Control` at all today — the versioned key is
what would make an `immutable` one safe to add, not evidence that one is set.

A poster is therefore **asynchronous**, and the write path reflects that:
`posterUploaded` / `photoUploaded` is no longer a claim the server checks. `true` is
accepted and ignored — the worker records the key off the S3 event — and `false` still
clears the image. `PosterService.confirmUpload` is gone with it. Cleanup goes **by the
stored key**, not by one derived from the id (`deleteStoredImage`), because the version
exists only on the row: a caller that deletes the row hands the key over.

The client has not caught up: it still sends `posterUploaded: true` (harmless) and
refetches immediately, so an admin can see the previous poster for a moment after
saving. Showing an upload as still processing is client work that has not been done.

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
- **Reactions, comments, reports and engagement counters hang off their subject by a
  nullable foreign key per kind** — an exclusive arc, with a `CHECK` that exactly one is
  set (ADR-0015). In TypeScript the subject is a union: `{ titleId }` or `{ commentId }`
  for reactions and counters, `{ titleId }` or `{ parentId }` for comments. Build one
  with the helpers (`titleTarget`, `commentTarget`, `titleSubject`, `replySubject`),
  never by hand.
- **The database cascades them.** Deleting a title or a comment takes the rows under it,
  replies included — there is no cleanup to call and none to forget. The one thing that
  does not follow is a _count_: `CommentService.remove` recomputes the parent's
  `commentCount`, because that is a number rather than a row.
- Adding a reactable or commentable kind is a **migration** — a nullable column, a
  widened CHECK, a backfill — not an enum value. The CHECKs are hand-written SQL that
  `prisma migrate diff` does not manage; they are listed in `docs/DOMAIN.md` beside the
  trigram index.
- **Reacting is one route pair for everything**:
  `PUT|DELETE /reactions/:entityType/:entityId` (`titles`, `comments`). Don't add a
  per-feature reaction route — casting a vote belongs to
  `ReactionService.setVote`/`clearVote`, which own it end to end.
- **The cache is a decorator over the uncached path, not a replacement for it.**
  `CachedReactionService` wraps `ReactionService` and delegates to it on
  `RedisUnavailableError`, so a Redis outage writes the row synchronously instead of
  refusing the vote. The controller injects the `REACTIONS` token, never a class, and
  `{ provide: REACTIONS, useExisting: CachedReactionService }` in `ReactionModule` is
  the single line that decides whether Redis is on the path of a request at all. Two
  consequences to keep: the fallback writes **no** cache key (absent means "unknown",
  so the next read goes to the row it just wrote — writing a guess there is what would
  make the two disagree), and only `RedisUnavailableError` falls back; everything else
  is a bug and must surface.
- **A reaction is absolute, never a toggle** (ADR-0016). The request names the vote the
  viewer wants to hold; sending the same one twice changes nothing the second time, and
  `DELETE` withdraws whether or not there was anything to withdraw. The reason is not
  REST tidiness: a toggle makes the _server_ decide, which means it has to read what
  the viewer holds before it can know what they want — and then every stale or missing
  read turns into a wrong write. Don't reintroduce a route that infers intent.
- **Likes, dislikes and comment counts are read as a relation, never aggregated.**
  `EngagementCountersService` is the only writer, and it recomputes on the caller's
  client so the counters commit with the rows they summarise — for reactions that
  caller is now `ReactionFlushProcessor`, which is where the `groupBy` went when it
  left the request. A title's score, rating count and watchlist count stay on
  `TitleEngagement` — only a title has those.
- **A viewer's vote is decided in Redis, counted in Postgres** (ADR-0016).
  `VoteStateService` (in `vote-cache/`, its own module so a reader can depend on the
  cache without pulling in the flush queue) keeps one key per (subject, viewer) pair —
  `vote:<arc>:<subjectId>:<userId>` = `L`/`D`/`N`, TTL 7d. `set` writes one with
  `SET … GET`: unconditional, one round trip, and the displaced value comes back to
  correct the counts in the response. Three things are load-bearing: a stored `N` means
  "holds no vote" while a **missing** key means "unknown"; **the cache never touches
  Postgres**, so not knowing arrives at the caller as `undefined` and each decides what
  to do with it (a read falls back to the relation, a flush reads the row through
  `rowVote`, a write wants it only to report a count); and **the cache is never asked
  for a count** — that is what lets it answer about one viewer without ever being
  complete.
- **`myReaction` on a read comes from the cache; the counts beside it do not.** A read
  asks `ViewerVotesService.forPage` for the whole page — one `MGET` — and hands each
  answer to the DTO, which settles it with `resolveVote`: a **present** entry wins over
  the `reactions` relation and an **absent** one falls back to it. Both halves matter,
  and the rule lives in one function because getting it backwards is silent: the
  relation is what the last flush left behind, so preferring it renders a vote the
  viewer's next request contradicts, while a cache miss has a free and correct answer
  already loaded. `readMany` under it is also the one place a Redis failure is
  swallowed — reads degrade to the relation, and writes degrade too (see the decorator
  below), so an unreachable Redis is not a 503.
- **A feature reads votes through `ViewerVotesService`, never through the cache.** It is
  the read half of the reaction domain and lives in `ViewerVotesModule`, apart from
  `ReactionModule` so that importing it does not bring the flush queue along — the same
  reason `UserAvatarService` stopped holding an `@InjectQueue`. It owns the id-to-arc
  mapping and the rule that an absent viewer reads nothing, both of which were written
  out once per feature before.
- `RedisService` extends `ioredis` the way `PrismaService` extends `PrismaClient`, and
  runs with `enableOfflineQueue: false`: a command issued while the socket is down
  rejects instead of waiting for a reconnect, which is what lets a caller choose
  between failing and falling back rather than hanging.
- A reply is a comment whose parent is a comment. Threads are one level deep because
  `CommentService` refuses the second, not because the schema does.
- `title/` holds two services. `TitleService` is the catalogue — CRUD and the read
  assembly. `TitleEngagementService` owns the score and the title-only counters
  (`rate`, `removeRating`, `readEngagement`, `recomputeWatchlistCounts`), and takes a
  client so the caller's transaction holds. `WatchlistService` injects the second
  directly; it used to reach through the first for a counter, which is why they split.

### Metrics

- **Metrics are module-level constants on `prom-client`'s default registry**, declared
  at the top of the file that measures the thing — beside `OMDB_SOURCE_MAP`, not inside
  a class. Nothing injects a registry. A metric built per instance throws on the second
  construction, because a registry refuses a duplicate name and every `beforeEach` that
  rebuilds a service would hit it.
  - The cost is shared state: observations carry over from one test to the next, so a
    spec asserting an exact value calls `register.resetMetrics()` in `beforeEach` (it
    clears values and keeps registrations). Four specs do.
  - Metrics with a `collect` callback are the awkward case, since `collect` runs on the
    metric and has no instance to read from. `QueueMetricsService` and `S3EventService`
    each set a module-level holder from their constructor, replacing rather than
    appending so a second construction leaves one sampler.
- **`GET /metrics` on the application port**, served by `MetricsController`, excluded
  from Swagger and `@SkipThrottle()`d because `ThrottlerGuard` is global and a scrape is
  not user traffic. Two things follow from sharing the port the Ingress publishes:
  - **The route refuses any request carrying `x-forwarded-for`, with a 404.** That
    header is what keeps route names, library versions and queue depths off the
    internet: Prometheus scrapes a pod by its IP and never crosses the proxy, while
    ingress-nginx always sets it. The alternative was an nginx `server-snippet` denying
    the path, which ingress-nginx ≥ 1.9 ignores unless `allow-snippet-annotations` is
    re-enabled — a protection that can silently not apply is worse than none.
  - Collection is not free (it reads Redis, and SQS), and on this port it competes with
    user traffic. Keep `collect` callbacks cheap, and never put metrics behind
    `/health`: the probes read that one, so a Redis blip would make kubelet restart the
    pod.
- **The worker exposes nothing.** `worker-main.ts` builds an application context with no
  HTTP server, and it was left that way deliberately. Its processors still record
  `video_transcode_duration_seconds`, `image_transcode_duration_seconds` and
  `image_size_ratio` — the metrics register themselves on import — but those numbers
  have no reader until the worker gets a listener of its own.
  - So anything the worker learns that the api should publish goes **through Redis**,
    like queue depth does. `ReactionReconciler` leaves its repair count under
    `reactions:drift:<arc>` and `VoteDriftMetricsService` samples it at scrape time.
    That number is the only evidence that "drift is rare and self-healing" — the
    assumption the whole vote cache rests on — is actually true.
  - `bullmq_queue_jobs` samples `completed` for the same reason: the flush processor
    runs in the worker, so the queue's own counts in Redis are how the api can see
    that votes are landing at all.
- **No identifier is ever a label.** No `userId`, `titleId`, `rawKey`, `jobId`. Each
  distinct label combination is a series Prometheus keeps for its own lifetime, so an id
  in that position is unbounded growth. Ids belong in the logs, which already carry
  them: a metric says how many and how bad, a log says which one.
- HTTP timing is `httpMetricsMiddleware`, registered with `app.use` and recording on
  `res.on("finish")`. Both reasons are load-bearing. `finish` is the first point where
  the exception filter has written the real status and Express has assigned the matched
  route — an interceptor reading `statusCode` in `finalize()` labels every thrown error
  with a status the handler never set. And the label is `req.route.path`, the route
  _pattern_: `/titles/:id`, never the URL.
- An outbound call with no timeout records no duration when it hangs — the timer never
  stops. Pair the histogram with an in-flight gauge where that can happen, as
  `ExternalRatingsService` does for OMDb, or a stalled request looks like an idle one.
- **A histogram carries one bucket set for every series it holds**, so a scale that
  differs by orders of magnitude is a separate metric, not another label value. That is
  why `video_transcode_duration_seconds` (10s…1h) and `image_transcode_duration_seconds`
  (0.25s…30s) are two names rather than one with a `queue` label.
- **Queue depth is read by the api**, since that is the process with a scrape endpoint.
  Depth is a property of Redis rather than of a process, so the numbers are the same
  either way. `QueueMetricsService` samples it at scrape time and takes its queues
  through the `METRICS_QUEUES` token, so it never imports a transcoder's queue name —
  the same arrangement as the image attachers; `VideoTranscoderModule` and
  `ImageTranscoderModule` export `BullModule` to make the tokens resolvable, while
  registration stays with the transcoder that owns the queue. In prod the api runs two
  replicas and both publish these series, so **aggregate with `max by (queue, state)`**,
  never `sum`.
- **A collector that throws fails the whole scrape.** `registry.metrics()` rejects as a
  unit, so an unreachable Redis or a denied SQS call would blank out every other metric
  in the process, including the ones that say it is alive. Anything sampling an external
  system in `collect` swallows and logs its own failure — `QueueMetricsService.sample`
  and `S3EventService.sampleDlq` both do.
- **"Unknown" must not serialise as a zero**, for the same reason `viewer` is nullable.
  An unlabelled gauge reports `0` from the moment it is registered, so `sqs_dlq_messages`
  carries a `queue` label and the series does not exist until a depth has actually been
  read. Reporting a confident `0` for a dead-letter queue that was never resolved would
  mean an alert on `> 0` never fires.
- An abort is not a failure. `video_transcode_duration_seconds` separates
  `outcome="aborted"` — the entity was deleted mid-transcode, and the job returns rather
  than throwing, so BullMQ does not retry — from `outcome="failed"`. Collapsing them
  makes routine admin deletions fire the failure-ratio alert.

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
  falsehood — and, on a toggle endpoint, undo the thing the user meant to keep. The vote
  cache does not touch this: `viewer` is decided by whether there was a viewer at all,
  and an anonymous read never asks the cache anything.
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

**A file that imports `@nestjs/schedule` cannot be unit-tested.** It ships ESM, jest
runs CJS, and the suite fails to parse before a single test runs — which is why nothing
carrying a `@Cron` has ever had a spec here. Keep the decorator in a class with no logic
of its own (`ReactionReconcileSchedule`) and the work it triggers somewhere a spec can
reach (`ReactionReconciler`).

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
- Comparing two of something and asserting the agreeing case only. A reconciler test
  where both counters matched passed with the dislike comparison deleted; it took a
  case where the likes agreed and the dislikes did not to pin it.
