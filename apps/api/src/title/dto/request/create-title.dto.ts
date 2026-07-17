import { ApiProperty } from "@nestjs/swagger";
import { TitleType } from "@prisma/client";
import { IsEnum, IsString, MaxLength } from "class-validator";

export class CreateTitleDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: TitleType })
  @IsEnum(TitleType)
  type: TitleType;
}
