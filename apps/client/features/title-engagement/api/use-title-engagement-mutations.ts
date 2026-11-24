import { catalogueCopies } from "@/features/title/api/catalogue-copies";
import createMutationHook from "@shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { ReactionResult, ReactionType, TitleEngagement } from "../schemas/title-engagement";
import titleEngagementService from "./title-engagement.service";

export const useSetTitleReaction = (
  titleId: string,
  options?: Omit<UseMutationOptions<ReactionResult, Error, ReactionType | null>, "mutationFn">,
) => {
  const useSet = createMutationHook<ReactionResult, ReactionType | null>({
    mutationFn: (vote: ReactionType | null) => titleEngagementService.setReaction(titleId, vote),
    getInvalidateKeys: () => catalogueCopies.titleEngagement(titleId),
  });
  return useSet(options);
};

export const useSetTitleWatchlist = (
  titleId: string,
  options?: Omit<UseMutationOptions<TitleEngagement, Error, boolean>, "mutationFn">,
) => {
  const useSet = createMutationHook({
    mutationFn: (next: boolean) =>
      next ? titleEngagementService.addToWatchlist(titleId) : titleEngagementService.removeFromWatchlist(titleId),
    getInvalidateKeys: () => catalogueCopies.titleEngagement(titleId),
  });
  return useSet(options);
};

export const useSetTitleRating = (titleId: string, options?: Omit<UseMutationOptions<TitleEngagement, Error, number>, "mutationFn">) => {
  const useSet = createMutationHook({
    mutationFn: (score: number) => titleEngagementService.rate(titleId, score),
    getInvalidateKeys: () => catalogueCopies.titleEngagement(titleId),
  });
  return useSet(options);
};

export const useRemoveTitleRating = (titleId: string, options?: Omit<UseMutationOptions<TitleEngagement, Error, void>, "mutationFn">) => {
  const useRemove = createMutationHook<TitleEngagement, void>({
    mutationFn: () => titleEngagementService.removeRating(titleId),
    getInvalidateKeys: () => catalogueCopies.titleEngagement(titleId),
  });
  return useRemove(options);
};
