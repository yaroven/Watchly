import { Comment, ReactionType, User } from "@prisma/client";
import { PageQuery } from "../../common/pagination/pagination.types";
import { Vote } from "../reaction/utils/vote.util";
import { CommentSortMode } from "./utils/comment-sort.const";

export interface CommentPageQuery extends PageQuery {
  sort?: CommentSortMode;
}

export interface CommentInput {
  text: string;
  hasSpoiler?: boolean;
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

export interface CommentView {
  id: string;
  author: CommentAuthorView;
  text: string;
  hasSpoiler: boolean;
  createdAt: Date;
  likes: number;
  dislikes: number;
  myReaction: ReactionType | null;
  replies: CommentView[];
  replyCount: number;
}

export interface CommentViewOptions {
  replies?: CommentView[];
  authorAvatarUrl?: string | null;

  myReaction?: Vote;
}
