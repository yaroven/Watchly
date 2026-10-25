import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Comment, ReactionType, User } from "@prisma/client";
import { resolveVote, Vote } from "../../../reaction/utils/vote.util";

export class CommentAuthorDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiPropertyOptional({
    description:
      "The author's own score for this title, current rather than frozen at posting time",
  })
  score: number | null;

  constructor(
    user: Pick<User, "id" | "email" | "displayName" | "avatarKey">,
    score: number | null,
    avatarUrl: string | null = null,
  ) {
    this.id = user.id;
    this.name = user.displayName ?? user.email.split("@")[0];
    this.avatarUrl = avatarUrl;
    this.score = score;
  }
}

export type CommentWithAuthor = Comment & {
  user: Pick<User, "id" | "email" | "displayName" | "avatarKey"> & {
    ratings?: { score: number }[];
  };
  counters?: { likes: number; dislikes: number; commentCount: number } | null;
  reactions?: { type: ReactionType }[];
};

export interface CommentResponseOptions {
  replies?: CommentResponseDto[];
  authorAvatarUrl?: string | null;

  myReaction?: Vote;
}

export class CommentResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ type: CommentAuthorDto })
  author: CommentAuthorDto;

  @ApiProperty()
  text: string;

  @ApiProperty()
  hasSpoiler: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  dislikes: number;

  @ApiPropertyOptional({
    enum: ReactionType,
    description: "What the current viewer voted, null if they have not or are anonymous",
  })
  myReaction: ReactionType | null;

  @ApiProperty({ description: `Up to ${3} replies. Fetch the rest from /comments/:id/replies.` })
  replies: CommentResponseDto[];

  @ApiProperty({ description: "How many replies exist in total, not how many are in `replies`" })
  replyCount: number;

  constructor(
    comment: CommentWithAuthor,
    { replies = [], authorAvatarUrl = null, myReaction }: CommentResponseOptions = {},
  ) {
    this.id = comment.id;
    this.author = new CommentAuthorDto(
      comment.user,
      comment.user.ratings?.[0]?.score ?? null,
      authorAvatarUrl,
    );
    this.text = comment.text;
    this.hasSpoiler = comment.hasSpoiler;
    this.createdAt = comment.createdAt;
    this.likes = comment.counters?.likes ?? 0;
    this.dislikes = comment.counters?.dislikes ?? 0;
    this.myReaction = resolveVote(myReaction, comment.reactions?.[0]?.type ?? null);
    this.replies = replies;
    this.replyCount = comment.counters?.commentCount ?? 0;
  }
}
