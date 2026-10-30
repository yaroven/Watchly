import { resolveVote } from "../reaction/utils/vote.util";
import { CommentView, CommentViewOptions, CommentWithAuthor } from "./comment.types";

export const toCommentView = (
  comment: CommentWithAuthor,
  { replies = [], authorAvatarUrl = null, myReaction }: CommentViewOptions = {},
): CommentView => ({
  id: comment.id,
  author: {
    id: comment.user.id,
    name: comment.user.displayName ?? comment.user.email.split("@")[0],
    avatarUrl: authorAvatarUrl,
    score: comment.user.ratings?.[0]?.score ?? null,
  },
  text: comment.text,
  hasSpoiler: comment.hasSpoiler,
  createdAt: comment.createdAt,
  likes: comment.counters?.likes ?? 0,
  dislikes: comment.counters?.dislikes ?? 0,
  myReaction: resolveVote(myReaction, comment.reactions?.[0]?.type ?? null),
  replies,
  replyCount: comment.counters?.commentCount ?? 0,
});
