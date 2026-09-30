import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ReactToCommentDto {
  @ApiProperty({
    enum: ReactionType,
    description: "Sending the reaction you already have withdraws it",
  })
  @IsEnum(ReactionType)
  type: ReactionType;
}
