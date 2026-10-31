import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import { ReactionResult } from "../../../../../services/reaction/reaction.types";

export class ReactionResultDto implements ReactionResult {
  @ApiProperty()
  likes: number;

  @ApiProperty()
  dislikes: number;

  @ApiProperty({ description: "How many comments the subject carries, replies not counted" })
  commentCount: number;

  @ApiProperty({
    enum: ReactionType,
    nullable: true,
    description: "The vote the caller now holds — exactly what they asked for, null after a DELETE",
  })
  myReaction: ReactionType | null;
}
