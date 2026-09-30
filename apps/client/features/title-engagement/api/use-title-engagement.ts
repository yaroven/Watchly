import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { TitleEngagement } from "../schemas/title-engagement";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

const useTitleEngagement = (
  titleId: string,
  options?: Omit<UseQueryOptions<TitleEngagement, Error, TitleEngagement, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  // Two separate hazards: the key carries the viewer so one person's vote is never
  // served to another, and the fetch waits for the session so the boot window does
  // not fill the anonymous entry on a signed-in viewer's behalf.
  const { viewerKey, sessionReady } = useViewer();

  return useQuery({
    queryKey: titleEngagementKeys.detail(titleId, viewerKey),
    queryFn: () => titleEngagementService.get(titleId),
    ...options,
    enabled: sessionReady && (options?.enabled ?? true),
  });
};

export default useTitleEngagement;
