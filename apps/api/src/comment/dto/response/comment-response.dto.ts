import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReactionType, TitleComment, User } from "@prisma/client";

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

export type CommentWithAuthor = TitleComment & {
  user: Pick<User, "id" | "email" | "displayName" | "avatarKey">;
};

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

  @ApiProperty({
    description: `Up to ${3} replies. Fetch the rest from /comments/:id/replies.`,
  })
  replies: CommentResponseDto[];

  @ApiProperty({ description: "How many replies exist in total, not how many are in `replies`" })
  replyCount: number;

  constructor(
    comment: CommentWithAuthor,
    counts: { likes: number; dislikes: number },
    myReaction: ReactionType | null,
    authorScore: number | null,
    replies: CommentResponseDto[] = [],
    replyCount = 0,
    authorAvatarUrl: string | null = null,
  ) {
    this.id = comment.id;
    this.author = new CommentAuthorDto(comment.user, authorScore, authorAvatarUrl);
    this.text = comment.text;
    this.hasSpoiler = comment.hasSpoiler;
    this.createdAt = comment.createdAt;
    this.likes = counts.likes;
    this.dislikes = counts.dislikes;
    this.myReaction = myReaction;
    this.replies = replies;
    this.replyCount = replyCount;
  }
}
