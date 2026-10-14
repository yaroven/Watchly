import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateTitleDto } from "./create-title.dto";

export class UpdateTitleDto extends CreateTitleDto {
  @ApiPropertyOptional({
    description:
      "False clears the poster. True is accepted and ignored: the upload goes to the raw bucket and the transcoding worker records the converted image on the title once it lands, so a new poster appears on a later read rather than in this response.",
  })
  @IsOptional()
  @IsBoolean()
  posterUploaded?: boolean;
}
