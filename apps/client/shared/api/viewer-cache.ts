import type { ViewerKey } from "@shared/lib/use-viewer";
import type { QueryFilters } from "@tanstack/react-query";

/**
 * Restricts a prefix match to one viewer's cache entries.
 *
 * Invalidating by prefix is right: every viewer's variant refetches its own data.
 * *Writing* by prefix is not — `setQueriesData` matches every key beneath the
 * prefix, so one person's `myReaction` lands in the anonymous entry and in every
 * other signed-in viewer still cached in the tab. That is the leak the viewer-keyed
 * query keys exist to prevent, through the one path the `ViewerKey` brand cannot
 * see: the brand checks keys being *built*, and a prefix write never builds one.
 *
 * Use it for any `setQueriesData` / `setQueryData` whose payload is viewer-dependent.
 */
export const forViewer = (prefix: readonly unknown[], viewerKey: ViewerKey): QueryFilters => ({
  predicate: ({ queryKey }) => startsWith(queryKey, prefix) && viewerKeyOf(queryKey) === viewerKey,
});

// A prefix longer than the key needs no length check of its own: the first index
// past the end compares `undefined` against a real segment and fails.
const startsWith = (queryKey: readonly unknown[], prefix: readonly unknown[]): boolean =>
  prefix.every((segment, index) => Object.is(queryKey[index], segment));

/**
 * The viewer rung is the last one by construction — every key object appends
 * `{ viewerKey }` last. A key without one answers `undefined`, which matches no
 * viewer: a write meant for one person must not reach an unscoped entry.
 *
 * Returned as `unknown` rather than cast to `ViewerKey`. The only use is an
 * equality check, and claiming the brand for whatever happens to sit in that slot
 * would be the one lie the brand exists to prevent.
 */
const viewerKeyOf = (queryKey: readonly unknown[]): unknown => {
  const last = queryKey[queryKey.length - 1];
  if (typeof last !== "object" || last === null || !("viewerKey" in last)) return undefined;

  return (last as { viewerKey: unknown }).viewerKey;
};
