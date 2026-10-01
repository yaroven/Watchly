import type { ViewerKey } from "@shared/lib/use-viewer";

/**
 * `detailPrefix` is an invalidation prefix, not a query key: the summary carries
 * `myScore`, so a key without the viewer in it hands one person's score to the
 * next one to ask in the same tab.
 */
const titleRatingKeys = {
  all: () => ["title-rating"] as const,
  detailPrefix: (titleId: string) => [...titleRatingKeys.all(), titleId] as const,
  detail: (titleId: string, viewerKey: ViewerKey) => [...titleRatingKeys.detailPrefix(titleId), { viewerKey }] as const,
};

export default titleRatingKeys;
