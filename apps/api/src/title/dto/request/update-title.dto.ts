import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { CreateTitleDto } from "./create-title.dto";

/** Full-object update: every field the client already has (from a prior GET) must be resent. */
export class UpdateTitleDto extends CreateTitleDto {
  @ApiProperty({ maxLength: 2048, description: "Must be a backend-generated poster URL" })
  @IsString()
  @MaxLength(2048)
  posterUrl: string;
}
