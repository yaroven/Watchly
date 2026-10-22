import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";

export class ReactionResultDto {
  @ApiProperty()
  likes: number;

  @ApiProperty()
  dislikes: number;

  @ApiProperty({ description: "How many comments the subject carries, replies not counted" })
  commentCount: number;

  @ApiProperty({
    enum: ReactionType,
    nullable: true,
    description: "The caller's own vote after this call — null once withdrawn",
  })
  myReaction: ReactionType | null;
}
