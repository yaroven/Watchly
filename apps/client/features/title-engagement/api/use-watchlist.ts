import type { CardTitle } from "@/features/title/schemas/title";
import { type LocalizedQueryOptions, useLocalizedQuery } from "@shared/api/localized-query";
import { useViewer } from "@shared/lib/use-viewer";
import { titleEngagementReads } from "./title-engagement.reads";

type WatchlistPage = { items: CardTitle[]; totalCount: number };

const useWatchlist = (params: { page?: number; limit?: number } = {}, options?: LocalizedQueryOptions<WatchlistPage>) => {
  const viewer = useViewer();
  return useLocalizedQuery(titleEngagementReads.watchlist(params), {
    ...options,
    enabled: viewer.status === "signed-in" && (options?.enabled ?? true),
  });
};

export default useWatchlist;
