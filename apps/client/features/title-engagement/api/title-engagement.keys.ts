import type { ViewerKey } from "@shared/lib/use-viewer";

const titleEngagementKeys = {
  all: () => ["title-engagement"] as const,
  detailsPrefix: () => [...titleEngagementKeys.all(), "detail"] as const,
  detailPrefix: (titleId: string) => [...titleEngagementKeys.detailsPrefix(), titleId] as const,
  detail: (titleId: string, viewerKey: ViewerKey) => [...titleEngagementKeys.detailPrefix(titleId), { viewerKey }] as const,
  watchlistsPrefix: () => [...titleEngagementKeys.all(), "watchlist"] as const,
  watchlist: (params: { page?: number; limit?: number }, viewerKey: ViewerKey) =>
    [...titleEngagementKeys.watchlistsPrefix(), params, { viewerKey }] as const,
};

export default titleEngagementKeys;
