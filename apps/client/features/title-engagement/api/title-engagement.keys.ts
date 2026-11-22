import type { ContentLocale } from "@shared/lib/content-locale";
import type { ViewerKey } from "@shared/lib/use-viewer";

const titleEngagementKeys = {
  all: () => ["title-engagement"] as const,
  detailsPrefix: () => [...titleEngagementKeys.all(), "detail"] as const,
  detailPrefix: (titleId: string) => [...titleEngagementKeys.detailsPrefix(), titleId] as const,
  detail: (titleId: string, viewerKey: ViewerKey) => [...titleEngagementKeys.detailPrefix(titleId), { viewerKey }] as const,
  watchlistsPrefix: () => [...titleEngagementKeys.all(), "watchlist"] as const,
  watchlist: (params: { page?: number; limit?: number }, viewerKey: ViewerKey, locale: ContentLocale) =>
    [...titleEngagementKeys.watchlistsPrefix(), params, { viewerKey, locale }] as const,
};

export default titleEngagementKeys;
