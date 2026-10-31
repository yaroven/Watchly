import commentKeys from "@/features/comment/api/comment.keys";
import titleKeys from "@/features/title/api/title.keys";
import titleEngagementKeys from "./title-engagement.keys";

/**
 * Every title read carries the engagement block, so the title caches go stale with
 * it — toggling from one poster has to update the same title in the other rails it
 * appears in. Each entry is a prefix covering every viewer-scoped variant beneath
 * it, and each is as narrow as the key tree allows: `detailPrefix`/`detail` reach one
 * title, and `stream`/`cast` sit outside `detailsPrefix()` so a like does not invalidate
 * a presigned playback URL.
 *
 * `watchlistsPrefix()` and `listsPrefix()` are genuinely broad — the toggled title sits
 * somewhere inside a paginated payload this layer cannot address more precisely.
 *
 * The comment lists are in here because a viewer's score also shows next to every
 * comment they left on the title. That used to live in a second `invalidateFor`
 * in the rating slice, which is one of the reasons the two merged.
 */
export const invalidateForTitle = (titleId: string) => [
  titleEngagementKeys.detailPrefix(titleId),
  titleEngagementKeys.watchlistsPrefix(),
  titleKeys.detailPrefix(titleId),
  titleKeys.listsPrefix(),
  commentKeys.titleListsPrefix(titleId),
];
