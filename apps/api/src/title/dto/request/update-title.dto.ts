import { ApiPropertyOptional } from "@nestjs/swagger";
import { TitleType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateTitleDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: TitleType })
  @IsEnum(TitleType)
  @IsOptional()
  type?: TitleType;

  @ApiPropertyOptional({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  posterUrl?: string;
}
