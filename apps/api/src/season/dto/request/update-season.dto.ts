import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateSeasonDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  number?: number;

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

  @ApiPropertyOptional({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  posterUrl?: string;
}
