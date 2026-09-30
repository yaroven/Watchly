import { useAuthStore } from "@shared/lib/auth-store";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { TitleEngagement } from "../schemas/title-engagement";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

const useTitleEngagement = (
  titleId: string,
  options?: Omit<UseQueryOptions<TitleEngagement, Error, TitleEngagement, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  // Carries the viewer's own vote and watchlist state, so fetching before the
  // session is restored would cache an anonymous answer under a shared key.
  const sessionReady = useAuthStore((state) => state.status) === "resolved";

  return useQuery({
    queryKey: titleEngagementKeys.detail(titleId),
    queryFn: () => titleEngagementService.get(titleId),
    ...options,
    enabled: sessionReady && (options?.enabled ?? true),
  });
};

export default useTitleEngagement;
