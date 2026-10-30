export const COMMENT_SORT_MODES = ["newest", "oldest", "hottest"] as const;
export type CommentSortMode = (typeof COMMENT_SORT_MODES)[number];
