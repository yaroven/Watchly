const titleEngagementKeys = {
  all: () => ["title-engagement"] as const,
  detail: (titleId: string) => [...titleEngagementKeys.all(), titleId] as const,
  watchlist: (params: { page?: number; limit?: number } = {}) => ["watchlist", params] as const,
  watchlists: () => ["watchlist"] as const,
};

export default titleEngagementKeys;
