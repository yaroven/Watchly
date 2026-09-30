import titleKeys from "@/features/title/api/title.keys";
import createMutationHook from "@shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { ReactionType, TitleEngagement } from "../schemas/title-engagement";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

/** Every title read carries the engagement block, so lists and the detail page go stale together with it. */
const invalidateFor = (titleId: string) => [
  titleEngagementKeys.detail(titleId),
  titleEngagementKeys.watchlists(),
  titleKeys.detail(titleId),
  titleKeys.lists(),
];

export const useReactToTitle = (
  titleId: string,
  options?: Omit<UseMutationOptions<TitleEngagement, Error, ReactionType>, "mutationFn">,
) => {
  const useReact = createMutationHook({
    mutationFn: (type: ReactionType) => titleEngagementService.react(titleId, type),
    getInvalidateKeys: () => invalidateFor(titleId),
  });
  return useReact(options);
};

export const useSetTitleWatchlist = (
  titleId: string,
  options?: Omit<UseMutationOptions<TitleEngagement, Error, boolean>, "mutationFn">,
) => {
  const useSet = createMutationHook({
    mutationFn: (next: boolean) =>
      next ? titleEngagementService.addToWatchlist(titleId) : titleEngagementService.removeFromWatchlist(titleId),
    getInvalidateKeys: () => invalidateFor(titleId),
  });
  return useSet(options);
};
