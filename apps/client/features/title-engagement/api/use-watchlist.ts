import type { Title } from "@/features/title/schemas/title";
import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

type WatchlistPage = { items: Title[]; totalCount: number };

const useWatchlist = (
  params: { page?: number; limit?: number } = {},
  options?: Omit<UseQueryOptions<WatchlistPage, Error, WatchlistPage, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  // The endpoint is the viewer's own list, so anonymous callers get a 401 —
  // wait for the session rather than firing one.
  const { viewerKey, isSignedIn } = useViewer();

  return useQuery({
    queryKey: titleEngagementKeys.watchlist(params, viewerKey),
    queryFn: () => titleEngagementService.getWatchlist(params),
    ...options,
    enabled: isSignedIn && (options?.enabled ?? true),
  });
};

export default useWatchlist;
