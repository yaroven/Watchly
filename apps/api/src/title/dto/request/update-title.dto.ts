import { TitleType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateTitleDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsEnum(TitleType)
  @IsOptional()
  type: TitleType;

  @IsString()
  @IsOptional()
  posterUrl: string;
}
