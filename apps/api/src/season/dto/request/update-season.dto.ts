import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateSeasonDto } from "./create-season.dto";

export class UpdateSeasonDto extends CreateSeasonDto {
  @ApiPropertyOptional({
    description:
      "False clears the poster. True is accepted and ignored: the upload goes to the raw bucket and the transcoding worker records the converted image on the season once it lands, so a new poster appears on a later read rather than in this response.",
  })
  @IsOptional()
  @IsBoolean()
  posterUploaded?: boolean;
}
