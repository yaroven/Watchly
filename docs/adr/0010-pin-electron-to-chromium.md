# ADR-0010 — `electron-to-chromium` is pinned

**Status:** accepted

## Context

Docker builds began failing on a transitive dependency nobody imports directly.

## Decision

A pnpm `overrides` entry pinning `electron-to-chromium` to `1.5.389`. The rationale sits
in `pnpm-workspace.yaml`:

> electron-to-chromium ships almost daily; a fresh release trips the minimumReleaseAge
> policy and breaks docker builds. Pin the transitive dependency to a version that
> already cleared the window.

## Consequences

- Builds stop breaking for reasons unrelated to any change in this repo.
- The pin is invisible in `package.json` dependencies — anyone debugging a stale
  browserslist target needs to know to look in `pnpm-workspace.yaml`.
- It needs bumping by hand occasionally. There is no Renovate or Dependabot here.
