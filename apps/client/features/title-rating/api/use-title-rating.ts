import { useAuthStore } from "@shared/lib/auth-store";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { TitleRatingSummary } from "../schemas/title-rating";
import titleRatingKeys from "./title-rating.keys";
import titleRatingService from "./title-rating.service";

const useTitleRating = (
  titleId: string,
  options?: Omit<UseQueryOptions<TitleRatingSummary, Error, TitleRatingSummary, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  // The summary carries the viewer's own score, so fetching before the session is restored
  // would cache an anonymous answer under a key every caller shares.
  const sessionReady = useAuthStore((state) => state.status) === "resolved";

  return useQuery({
    queryKey: titleRatingKeys.detail(titleId),
    queryFn: () => titleRatingService.get(titleId),
    ...options,
    enabled: sessionReady && (options?.enabled ?? true),
  });
};

export default useTitleRating;
