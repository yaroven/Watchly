import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CreateTitleDto } from "./create-title.dto";

/** Full-object update: every field the client already has (from a prior GET) must be resent. */
export class UpdateTitleDto extends CreateTitleDto {
  @ApiPropertyOptional({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  posterUrl?: string;
}
