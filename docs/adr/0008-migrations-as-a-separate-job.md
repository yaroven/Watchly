# ADR-0008 — Migrations run as their own Job, before the rollout

**Status:** accepted

## Context

Code that expects a column must not start before the column exists.

## Decision

`make migrate-home SHA=<sha>` applies `k8s/home/migration` and waits for completion;
`make deploy-home SHA=<sha>` rolls out the code afterwards. Two commands, deliberately.
The `Makefile` records why:

> Separate from deploy-home on purpose: schema changes go out before the code that needs
> them. The Job's pod template is immutable, so a previous run has to go before this one
> can be created.

## Consequences

- No window where new code meets an old schema.
- The previous Job is deleted before re-applying — a Job pod template cannot be patched.
- Nothing stops someone running `deploy-home` without `migrate-home`; the ordering is a
  convention held by the Makefile, not by the cluster.
