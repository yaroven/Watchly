import { Comment, CommentReaction } from "../schemas/comment";
import { CommentPage } from "./comment.service";

export interface InfiniteComments {
  pages: CommentPage[];
  pageParams: unknown[];
}

const applyReaction = (comment: Comment, commentId: string, result: CommentReaction): Comment => {
  if (comment.id === commentId) return { ...comment, ...result };
  if (comment.replies.length === 0) return comment;
  return { ...comment, replies: comment.replies.map((reply) => applyReaction(reply, commentId, result)) };
};

export const withReactionInList = (
  data: InfiniteComments | undefined,
  commentId: string,
  result: CommentReaction,
): InfiniteComments | undefined =>
  data
    ? {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => applyReaction(item, commentId, result)),
        })),
      }
    : data;

export const withReactionInReplies = (
  data: CommentPage | undefined,
  commentId: string,
  result: CommentReaction,
): CommentPage | undefined => (data ? { ...data, items: data.items.map((item) => applyReaction(item, commentId, result)) } : data);
