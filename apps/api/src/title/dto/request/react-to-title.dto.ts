import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ReactToTitleDto {
  @ApiProperty({ enum: ReactionType })
  @IsEnum(ReactionType)
  type: ReactionType;
}
