import { CommentSortMode } from "../schemas/comment";

const commentKeys = {
  all: () => ["comment"] as const,
  lists: () => [...commentKeys.all(), "list"] as const,
  list: (titleId: string, sort: CommentSortMode = "newest", limit = 10) => [...commentKeys.lists(), titleId, { sort, limit }] as const,
  titleLists: (titleId: string) => [...commentKeys.lists(), titleId] as const,
  replies: () => [...commentKeys.all(), "replies"] as const,
  reply: (commentId: string) => [...commentKeys.replies(), commentId] as const,
};

export default commentKeys;
