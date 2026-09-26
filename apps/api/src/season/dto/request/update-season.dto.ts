import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CreateSeasonDto } from "./create-season.dto";

/**
 * Full-object update: every field the client already has (from a prior GET) must be resent.
 * `posterUrl` stays optional — a season has no poster until one is uploaded, unlike Title's
 * always-present default.
 */
export class UpdateSeasonDto extends CreateSeasonDto {
  @ApiPropertyOptional({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  posterUrl?: string;
}
