import type { ViewerKey } from "@shared/lib/use-viewer";

/**
 * One root, `all() → …`, so invalidating the feature invalidates the watchlist too.
 *
 * Members named `*Prefix` (and `all`) are **invalidation prefixes, not query keys**:
 * they carry no viewer, so reading through one would share a single cache entry
 * between viewers. Only `detail` and `watchlist` are complete. The naming is the
 * only thing marking that — a prefix is structurally still a valid `queryKey`.
 * What the `ViewerKey` brand does enforce is that a complete key cannot be built
 * from a bare string.
 */
const titleEngagementKeys = {
  all: () => ["title-engagement"] as const,
  detailsPrefix: () => [...titleEngagementKeys.all(), "detail"] as const,
  /** Every viewer's copy of one title — the narrow prefix a per-title write wants. */
  detailPrefix: (titleId: string) => [...titleEngagementKeys.detailsPrefix(), titleId] as const,
  detail: (titleId: string, viewerKey: ViewerKey) => [...titleEngagementKeys.detailPrefix(titleId), { viewerKey }] as const,
  watchlistsPrefix: () => [...titleEngagementKeys.all(), "watchlist"] as const,
  watchlist: (params: { page?: number; limit?: number }, viewerKey: ViewerKey) =>
    [...titleEngagementKeys.watchlistsPrefix(), params, { viewerKey }] as const,
};

export default titleEngagementKeys;
