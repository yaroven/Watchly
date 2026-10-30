import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import { CommentAuthorView, CommentView } from "../../../../../services/comment/comment.types";

export class CommentAuthorDto implements CommentAuthorView {
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
}

export class CommentResponseDto implements CommentView {
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
}
