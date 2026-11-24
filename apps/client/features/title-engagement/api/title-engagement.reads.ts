import type { CardTitle } from "@/features/title/schemas/title";
import type { LocalizedRead } from "@shared/api/localized-query";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

type WatchlistPage = { items: CardTitle[]; totalCount: number };

export const titleEngagementReads = {
  watchlist: (params: { page?: number; limit?: number } = {}): LocalizedRead<WatchlistPage> => ({
    key: ({ locale, viewerKey }) => titleEngagementKeys.watchlist(params, viewerKey, locale),
    fetch: (locale) => titleEngagementService.getWatchlist(params, locale),
  }),
};
