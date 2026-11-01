import { Comment, ReactionType, User } from "@prisma/client";
import { PageQuery } from "../../common/pagination/pagination.types";
import { CommentSortMode } from "./utils/comment-sort.const";

export interface CommentPageQuery extends PageQuery {
  sort?: CommentSortMode;
}

export interface CommentInput {
  text: string;
  hasSpoiler?: boolean;
  parentId?: string;
}

export type CommentWithAuthor = Comment & {
  user: Pick<User, "id" | "email" | "displayName" | "avatarKey"> & {
    ratings?: { score: number }[];
  };
  counters?: { likes: number; dislikes: number; commentCount: number } | null;
  reactions?: { type: ReactionType }[];
};

export interface CommentAuthorView {
  id: string;
  name: string;
  avatarUrl: string | null;
  score: number | null;
}

interface CommentViewBase {
  id: string;
  author: CommentAuthorView;
  text: string;
  hasSpoiler: boolean;
  createdAt: Date;
  likes: number;
  dislikes: number;
  replyCount: number;
}

export interface CommentView extends CommentViewBase {
  myReaction: ReactionType | null;
  replies: CommentView[];
}

export interface StoredCommentView extends CommentViewBase {
  storedReaction: ReactionType | null;
  replies: StoredCommentView[];
}

export interface CommentViewOptions {
  replies?: StoredCommentView[];
  authorAvatarUrl?: string | null;
}
