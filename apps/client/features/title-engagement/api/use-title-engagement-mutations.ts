import titleKeys from "@/features/title/api/title.keys";
import createMutationHook from "@shared/api/createMutationHook";
import { UseMutationOptions } from "@tanstack/react-query";
import { ReactionType, TitleEngagement } from "../schemas/title-engagement";
import titleEngagementKeys from "./title-engagement.keys";
import titleEngagementService from "./title-engagement.service";

/**
 * Every title read carries the engagement block, so the title caches go stale with
 * it — toggling from one poster has to update the same title in the other rails it
 * appears in. Each entry is a prefix covering every viewer-scoped variant beneath
 * it, and each is as narrow as the key tree allows: `detailPrefix`/`detail` reach one
 * title, and `stream`/`cast` sit outside `details()` so a like does not invalidate
 * a presigned playback URL.
 *
 * `watchlistsPrefix()` and `listsPrefix()` are genuinely broad — the toggled title sits
 * somewhere inside a paginated payload this layer cannot address more precisely.
 */
const invalidateFor = (titleId: string) => [
  titleEngagementKeys.detailPrefix(titleId),
  titleEngagementKeys.watchlistsPrefix(),
  titleKeys.detailPrefix(titleId),
  titleKeys.listsPrefix(),
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
