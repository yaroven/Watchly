# ADR-0009 — The client is organised in feature slices

**Status:** accepted

## Context

Layer-first folders (`components/`, `hooks/`, `services/`) scatter one feature across the
tree and make ownership unclear.

## Decision

`features/<domain>/` with `api/`, `components/`, `schemas/` and an `index.ts` public
surface. `app/` holds routing only. `shared/` holds what genuinely crosses features.

Enforced by ESLint rather than convention — `apps/client/eslint.config.mjs` carries three
custom rules: `app-is-routing-only`, `layer-boundaries` (shared may not import features
or app) and `features-never-import-routes`.

## Consequences

- A feature can be read, moved or deleted as a unit.
- Cross-feature access goes through `index.ts`, so internals stay free to change.
- The rules only run in the pre-commit hook — ESLint is absent from CI, so the boundaries
  are unenforced on the server side. Closing that is open work.
