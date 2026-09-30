/**
 * One root, `all() → …`, so invalidating the feature invalidates the watchlist too.
 * Every key carries the viewer: the values are that viewer's own vote and watchlist
 * state, and a shared key would serve them to whoever asks next.
 */
const titleEngagementKeys = {
  all: () => ["title-engagement"] as const,
  details: () => [...titleEngagementKeys.all(), "detail"] as const,
  detail: (titleId: string, viewerKey: string) => [...titleEngagementKeys.details(), titleId, { viewerKey }] as const,
  watchlists: () => [...titleEngagementKeys.all(), "watchlist"] as const,
  watchlist: (params: { page?: number; limit?: number }, viewerKey: string) =>
    [...titleEngagementKeys.watchlists(), params, { viewerKey }] as const,
};

export default titleEngagementKeys;
