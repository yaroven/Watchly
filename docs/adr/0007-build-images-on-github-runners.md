# ADR-0007 — Images are built on GitHub runners, not locally

**Status:** accepted

## Context

The cluster is amd64. The development laptop is Apple silicon.

## Decision

`make release-home` dispatches the "Release Images" workflow and the images are built on
GitHub's runners. The rationale is recorded verbatim in the `Makefile`:

> Runs the build on GitHub rather than locally: the runners are amd64 like the cluster,
> and an Apple-silicon laptop only reaches that through emulation.

## Consequences

- No cross-arch emulation, and the artifact that ships is the artifact CI produced.
- Deploying means waiting for a run: `make release-home`, watch it, take the sha it
  prints as `Publishing <sha>`, then `make migrate-home SHA=` and `make deploy-home SHA=`.
- Deploys are pinned to immutable sha tags, so redeploying "the same version" is
  genuinely the same image.
