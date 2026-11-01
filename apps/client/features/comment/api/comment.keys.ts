import type { ViewerKey } from "@shared/lib/use-viewer";
import { CommentSortMode } from "../schemas/comment";

const commentKeys = {
  all: () => ["comment"] as const,
  listsPrefix: () => [...commentKeys.all(), "list"] as const,
  titleListsPrefix: (titleId: string) => [...commentKeys.listsPrefix(), titleId] as const,
  list: (titleId: string, sort: CommentSortMode = "newest", limit = 10, viewerKey: ViewerKey) =>
    [...commentKeys.titleListsPrefix(titleId), { sort, limit }, { viewerKey }] as const,
  repliesPrefix: () => [...commentKeys.all(), "replies"] as const,
  replyPrefix: (commentId: string) => [...commentKeys.repliesPrefix(), commentId] as const,
  reply: (commentId: string, viewerKey: ViewerKey) => [...commentKeys.replyPrefix(commentId), { viewerKey }] as const,
};

export default commentKeys;
