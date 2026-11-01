import { ViewerVotes, VotedSubject } from "../vote-cache/vote-cache.const";
import {
  CommentView,
  CommentViewOptions,
  CommentWithAuthor,
  StoredCommentView,
} from "./comment.types";

export const toCommentView = (
  comment: CommentWithAuthor,
  { replies = [], authorAvatarUrl = null }: CommentViewOptions = {},
): StoredCommentView => ({
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
  storedReaction: comment.reactions?.[0]?.type ?? null,
  replies,
  replyCount: comment.counters?.commentCount ?? 0,
});

export const votedSubjectsOf = (comments: StoredCommentView[]): VotedSubject[] =>
  comments.flatMap((comment) => [
    { id: comment.id, storedVote: comment.storedReaction },
    ...votedSubjectsOf(comment.replies),
  ]);

export const withVotes = (comment: StoredCommentView, votes: ViewerVotes): CommentView => {
  const { storedReaction: _stored, replies, ...rest } = comment;

  return {
    ...rest,
    myReaction: votes.get(comment.id) ?? null,
    replies: replies.map((reply) => withVotes(reply, votes)),
  };
};
