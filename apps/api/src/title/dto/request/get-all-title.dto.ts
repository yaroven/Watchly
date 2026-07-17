import { ApiPropertyOptional } from "@nestjs/swagger";
import { TitleType, TranscodingStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class GetAllTitleDto {
  @ApiPropertyOptional({ maxLength: 255, description: "Case-insensitive substring match on name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: TitleType })
  @IsOptional()
  @IsEnum(TitleType)
  type?: TitleType;

  @ApiPropertyOptional({ enum: TranscodingStatus })
  @IsOptional()
  @IsEnum(TranscodingStatus)
  transcodingStatus?: TranscodingStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sort?: "asc" | "desc";

  @ApiPropertyOptional({ maxLength: 100, description: "Title field name to sort by" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sortBy?: string;
}
