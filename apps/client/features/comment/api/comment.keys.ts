import type { ViewerKey } from "@shared/lib/use-viewer";
import { CommentSortMode } from "../schemas/comment";

/**
 * Members named `*Prefix` are invalidation prefixes, not query keys: a comment
 * carries the viewer's own `myReaction`, so a key without the viewer in it serves
 * one person's votes to the next one to ask in the same tab.
 */
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
