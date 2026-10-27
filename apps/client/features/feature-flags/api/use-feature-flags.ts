import { useViewer } from "@shared/lib/use-viewer";
import { useQuery } from "@tanstack/react-query";
import featureFlagKeys from "./feature-flag.keys";
import featureFlagService from "./feature-flag.service";

const FLAGS_STALE_TIME = 5 * 60 * 1000;

const useFeatureFlags = () => {
  const viewer = useViewer();

  return useQuery({
    queryKey: featureFlagKeys.snapshot(viewer.viewerKey),
    queryFn: featureFlagService.getAll,
    staleTime: FLAGS_STALE_TIME,
    enabled: viewer.status !== "pending",
  });
};

export default useFeatureFlags;
