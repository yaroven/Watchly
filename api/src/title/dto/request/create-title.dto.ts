import { TitleType } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class CreateTitleDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(TitleType)
  type: TitleType;

  @IsString()
  posterUrl: string;
}
