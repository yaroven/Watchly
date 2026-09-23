import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AgeRating, TitleType } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

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

  @ApiProperty({ enum: AgeRating })
  @IsEnum(AgeRating)
  ageRating: AgeRating;

  @ApiProperty({ maxLength: 100, description: "Country of origin" })
  @IsString()
  @MaxLength(100)
  country: string;

  @ApiProperty({ description: "ISO 8601 date" })
  @IsDateString()
  releaseDate: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  language: string;

  @ApiProperty({ maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  trailerUrl: string;

  @ApiProperty({ minimum: 0, description: "Runtime in minutes" })
  @IsInt()
  @Min(0)
  runtime: number;

  @ApiProperty({ maxLength: 100, description: "Broadcast network or streaming platform" })
  @IsString()
  @MaxLength(100)
  network: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  director: string;

  @ApiProperty()
  @IsBoolean()
  closedCaption: boolean;

  @ApiPropertyOptional({ type: [String], format: "uuid", description: "Genre ids to attach" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  genreIds?: string[];
}
