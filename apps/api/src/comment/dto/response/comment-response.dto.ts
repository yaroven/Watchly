import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReactionType, TitleComment, User } from "@prisma/client";

/**
 * The author as a reader sees them. `displayName` is nullable on User for
 * accounts that predate it, so the email local part stands in — never the
 * address itself, which is not the commenter's to publish.
 */
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
    user: Pick<User, "id" | "email" | "displayName" | "avatarUrl">,
    score: number | null,
  ) {
    this.id = user.id;
    this.name = user.displayName ?? user.email.split("@")[0];
    this.avatarUrl = user.avatarUrl;
    this.score = score;
  }
}

export type CommentWithAuthor = TitleComment & {
  user: Pick<User, "id" | "email" | "displayName" | "avatarUrl">;
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
    description: "Replies to this comment. Always empty on a reply — threads are one level deep.",
  })
  replies: CommentResponseDto[];

  constructor(
    comment: CommentWithAuthor,
    counts: { likes: number; dislikes: number },
    myReaction: ReactionType | null,
    authorScore: number | null,
    replies: CommentResponseDto[] = [],
  ) {
    this.id = comment.id;
    this.author = new CommentAuthorDto(comment.user, authorScore);
    this.text = comment.text;
    this.hasSpoiler = comment.hasSpoiler;
    this.createdAt = comment.createdAt;
    this.likes = counts.likes;
    this.dislikes = counts.dislikes;
    this.myReaction = myReaction;
    this.replies = replies;
  }
}
