import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { TitleRatingSummary } from "../schemas/title-rating";
import titleRatingKeys from "./title-rating.keys";
import titleRatingService from "./title-rating.service";

const useTitleRating = (
  titleId: string,
  options?: Omit<UseQueryOptions<TitleRatingSummary, Error, TitleRatingSummary, readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  // Two hazards: the key carries the viewer so one person's score is never served
  // to another, and the fetch waits for the session so the boot window does not
  // fill the anonymous entry on a signed-in viewer's behalf.
  const viewer = useViewer();

  return useQuery({
    queryKey: titleRatingKeys.detail(titleId, viewer.viewerKey),
    queryFn: () => titleRatingService.get(titleId),
    ...options,
    enabled: viewer.status !== "pending" && (options?.enabled ?? true),
  });
};

export default useTitleRating;
