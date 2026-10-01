import commentKeys from "@/features/comment/api/comment.keys";
import titleKeys from "@/features/title/api/title.keys";
import createMutationHook from "@/shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { TitleRatingSummary } from "../schemas/title-rating";
import titleRatingKeys from "./title-rating.keys";
import titleRatingService from "./title-rating.service";

/** A viewer's score also shows next to every comment they left on the title, so those refetch too. */
const invalidateFor = (titleId: string) => [
  titleRatingKeys.detail(titleId),
  titleKeys.detailPrefix(titleId),
  commentKeys.titleLists(titleId),
];

export const useSetTitleRating = (titleId: string, options?: Omit<UseMutationOptions<TitleRatingSummary, Error, number>, "mutationFn">) => {
  const useSet = createMutationHook({
    mutationFn: (score: number) => titleRatingService.set(titleId, score),
    getInvalidateKeys: () => invalidateFor(titleId),
  });
  return useSet(options);
};

export const useRemoveTitleRating = (
  titleId: string,
  options?: Omit<UseMutationOptions<TitleRatingSummary, Error, void>, "mutationFn">,
) => {
  const useRemove = createMutationHook<TitleRatingSummary, void>({
    mutationFn: () => titleRatingService.remove(titleId),
    getInvalidateKeys: () => invalidateFor(titleId),
  });
  return useRemove(options);
};
