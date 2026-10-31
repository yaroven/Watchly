import ReactionType from "@/types/reaction-type";

export { ReactionType };

export const COMMENT_SORT_MODES = ["newest", "oldest", "hottest"] as const;
export type CommentSortMode = (typeof COMMENT_SORT_MODES)[number];

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  score: number | null;
}

export interface Comment {
  id: string;
  author: CommentAuthor;
  text: string;
  hasSpoiler: boolean;
  createdAt: Date;
  likes: number;
  dislikes: number;
  myReaction: ReactionType | null;
  replies: Comment[];
  replyCount: number;
}

export interface GetCommentsDto {
  page?: number;
  limit?: number;
  sort?: CommentSortMode;
}

export interface CreateCommentDto {
  text: string;
  hasSpoiler?: boolean;
  parentId?: string;
}

export interface CommentReaction {
  likes: number;
  dislikes: number;
  myReaction: ReactionType | null;
}
