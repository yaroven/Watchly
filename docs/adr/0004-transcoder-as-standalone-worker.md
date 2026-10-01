# ADR-0004 — The transcoder is its own process

**Status:** accepted

## Context

ffmpeg runs for minutes and saturates CPU. The API must stay responsive.

## Decision

`src/worker-main.ts` is a second entrypoint in the same codebase, built from the same
Dockerfile as a different target (`worker-runner`) and deployed as its own workload. Work
reaches it through BullMQ on Redis.

## Consequences

- A transcode cannot occupy an API request thread, and the worker scales separately.
- Both processes share the Prisma schema and config modules, so there is no second
  source of truth for the domain.
- Job state lives in Redis; losing Redis loses the queue, not the catalogue.
