import type { ViewerKey } from "@shared/lib/use-viewer";

/**
 * One root, `all() → …`, so invalidating the feature invalidates the watchlist too.
 *
 * `all`, `details`, `watchlists` and `detailsFor` are **invalidation prefixes, not
 * query keys** — they carry no viewer, so reading through one would share a single
 * cache entry between viewers. Only `detail` and `watchlist` are complete, and both
 * require a `ViewerKey` that nothing but `useViewer` can mint.
 */
const titleEngagementKeys = {
  all: () => ["title-engagement"] as const,
  details: () => [...titleEngagementKeys.all(), "detail"] as const,
  /** Every viewer's copy of one title — the narrow prefix a per-title write wants. */
  detailsFor: (titleId: string) => [...titleEngagementKeys.details(), titleId] as const,
  detail: (titleId: string, viewerKey: ViewerKey) => [...titleEngagementKeys.detailsFor(titleId), { viewerKey }] as const,
  watchlists: () => [...titleEngagementKeys.all(), "watchlist"] as const,
  watchlist: (params: { page?: number; limit?: number }, viewerKey: ViewerKey) =>
    [...titleEngagementKeys.watchlists(), params, { viewerKey }] as const,
};

export default titleEngagementKeys;
