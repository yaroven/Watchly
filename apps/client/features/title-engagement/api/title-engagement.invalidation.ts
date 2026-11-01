import commentKeys from "@/features/comment/api/comment.keys";
import titleKeys from "@/features/title/api/title.keys";
import titleEngagementKeys from "./title-engagement.keys";

export const invalidateForTitle = (titleId: string) => [
  titleEngagementKeys.detailPrefix(titleId),
  titleEngagementKeys.watchlistsPrefix(),
  titleKeys.detailPrefix(titleId),
  titleKeys.listsPrefix(),
  commentKeys.titleListsPrefix(titleId),
];
