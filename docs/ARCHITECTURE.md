# Architecture

## Services

Defined in `config/dev/docker-compose.yml`, started with `pnpm dev:up`.

| Service | What it is | Dev port (host→container) |
| --- | --- | --- |
| `nginx` | Dev edge; this is the origin the browser uses | 4000 |
| `client` | Next.js 16 App Router | behind nginx |
| `api` | NestJS HTTP API — `src/main.ts` | 3000 |
| `transcoder-worker` | Same image, `src/worker-main.ts` entrypoint | — |
| `db` | Postgres | 5433→5432 |
| `redis` | BullMQ backend | 6379 |
| `localstack` | S3 + SQS stand-ins | 4566 |
| `grafana` | Log UI | 3001→3000 |
| `loki` | Log store | 3100 |

The api and the worker are the same build with different entrypoints and different
Dockerfile targets (`runner`, `worker-runner`, plus `migrator` for schema jobs).

## Media pipeline

An upload is written to the raw S3 bucket. S3 emits an event to SQS; `s3-event` consumes
it with `sqs-consumer` and enqueues a BullMQ job. The **worker process** — not a thread
in the API — picks it up, runs ffmpeg and writes its output to the processed bucket.

Every raw object carries a kind prefix, and which queue the event lands on is a `switch`
on that prefix. `src/s3/raw-key/` owns the scheme:

| Prefix | Queue | Output |
| --- | --- | --- |
| `title-video/<titleId>` | `video-transcode` | HLS, plus `transcodingStatus` and the `VideoTranscodingProgress` row the client polls |
| `episode-video/<episodeId>` | `video-transcode` | as above, on the episode |
| `user-avatar/<userId>/<uploadId>` | `user-avatar` | a 256×256 webp, plus `User.avatarKey` |

Before this, the consumer took a raw key to be a bare entity uuid and probed the database
for a row that matched — episode first, then title. The type of an upload was a property
of whichever rows happened to exist rather than of the upload, so a third kind of object
could not be told apart from a stale one. A key that parses to nothing is now logged and
skipped rather than guessed at; bare-uuid keys still route through the old probe, for
objects uploaded before the scheme.

Playback is hls.js against a presigned URL. Avatars are served unsigned, since a public
avatar gains nothing from an expiring link and loses browser caching.

Ingest is event-driven rather than polled, and the worker is a separate process, so a
long transcode cannot occupy an API request thread. See ADR-0004 and ADR-0005.

## Auth

JWT access token in memory on the client, refresh token in an httpOnly cookie. This is
why CORS runs with `credentials: true` — without it the browser discards the refresh
response entirely.

Public read routes use `@OptionalAuth()`: they answer anonymously when there is no
viewer, and still answer anonymously (not 401) when a credential is present but
rejected. Keeping the access token fresh is therefore the client's job — the request
interceptor in `shared/api/axios.ts` refreshes before sending an expired token. See
ADR-0006.

## Deploy

Kustomize overlays in `k8s/`: `base`, plus `dev`, `home` and `prod`, plus a `migration`
Job. The `home` overlay additionally runs its own postgres, redis, minio and localstack
in-cluster.

Driven by the `Makefile`:

```
make release-home                 # build + push images on GitHub runners
make migrate-home SHA=<sha>       # run the migration Job at that build
make deploy-home SHA=<sha>        # point the overlay at it and roll out
make status-home
```

Migrations go out before the code that needs them, as a separate step. See ADR-0007 and
ADR-0008.

## CI

`.github/workflows/`: `api-test`, `build-api`, `build-client`, `pr-title-lint`,
`release-images`, `deploy-home`, `backport`.

Read the "What the gates actually check" section of the root `CLAUDE.md` before trusting
a green run — in particular, the `lint` check is the PR *title* linter, ESLint never runs
in CI, and the paths-filter wrappers let a job report success having built nothing.

`deploy-home` is `workflow_dispatch` only, deliberately: the runner is self-hosted on a
home LAN and the repo is public, so a `pull_request` trigger would let a fork execute on
that machine.

## Local gates

husky: `commit-msg` → commitlint, `pre-commit` → `pnpm lint`, `pre-push` → `pnpm test`.
