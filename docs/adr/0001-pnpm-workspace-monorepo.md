# ADR-0001 — pnpm workspace monorepo

**Status:** accepted

## Context

Client and API are developed together and share nothing but a wire contract. They need
separate toolchains (Next.js vs Nest) but one checkout, one lockfile and one CI.

## Decision

A pnpm workspace pinned to `pnpm@10.30.0` via `packageManager`, with `packages: ['apps/*']`.
npm and yarn are not used. `pnpm install --frozen-lockfile` in every CI job and both
Dockerfiles is the lockfile-drift gate.

`pnpm-workspace.yaml` also carries an `allowBuilds` allowlist, so a transitive package
cannot run a postinstall script unless it is named there — a supply-chain control.

## Consequences

- Cross-app refactors are one commit.
- Each app keeps its own tsconfig, ESLint and Prettier config. There is **no shared
  base**, so they have drifted: TypeScript 5.7 vs 6.0, Prettier 3.4 vs 3.7, printWidth
  100 vs 140, and `strict` on in the client but off in the api. Converging them is open
  work.
- There is no Turborepo/Nx task graph; root scripts fan out with `pnpm --filter`.
