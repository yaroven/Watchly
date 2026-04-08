import { TitleType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class GetAllTitleDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TitleType)
  type?: TitleType;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsNumber()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sort?: "asc" | "desc";

  @IsOptional()
  @IsString()
  sortBy?: string;
}
