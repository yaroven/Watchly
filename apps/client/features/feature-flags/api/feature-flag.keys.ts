import type { ViewerKey } from "@shared/lib/use-viewer";

const featureFlagKeys = {
  all: () => ["feature-flags"] as const,
  snapshot: (viewerKey: ViewerKey) => [...featureFlagKeys.all(), { viewerKey }] as const,
};

export default featureFlagKeys;
