import titleKeys from "@/features/title/api/title.keys";
import createMutationHook from "@shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { ReactionType, TitleEngagement } from "../schemas/title-engagement";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

/**
 * Every title read carries the engagement block, so the title caches go stale with
 * it — toggling from one poster has to update the same title in the other rails it
 * appears in. Each entry is a prefix, which covers every viewer-scoped variant
 * beneath it; `stream` and `cast` sit outside `details()` so they are not dragged
 * along. `lists()` is unavoidably broad: a list page holds the toggled title
 * somewhere inside a payload this layer cannot address more precisely.
 */
const invalidateFor = (titleId: string) => [
  titleEngagementKeys.details(),
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
