import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CreateSeasonDto } from "./create-season.dto";

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {
  @ApiPropertyOptional({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  posterUrl?: string;
}
