import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CreateTitleDto } from "./create-title.dto";

export class UpdateTitleDto extends PartialType(CreateTitleDto) {
  @ApiPropertyOptional({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  posterUrl?: string;
}
