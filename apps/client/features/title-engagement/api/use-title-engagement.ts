import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { TitleEngagement } from "../schemas/title-engagement";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

const useTitleEngagement = (
  titleId: string,
  options?: Omit<UseQueryOptions<TitleEngagement, Error, TitleEngagement, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  const viewer = useViewer();

  return useQuery({
    queryKey: titleEngagementKeys.detail(titleId, viewer.viewerKey),
    queryFn: () => titleEngagementService.get(titleId),
    ...options,
    enabled: viewer.status !== "pending" && (options?.enabled ?? true),
  });
};

export default useTitleEngagement;
