import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateTitleDto } from "./create-title.dto";

/** Full-object update: every field the client already has (from a prior GET) must be resent. */
export class UpdateTitleDto extends CreateTitleDto {
  @ApiPropertyOptional({
    description:
      "True once the image has been PUT to the upload URL. The key is derived from the title, so no URL is sent; the server checks the object is there before storing it. False clears the poster.",
  })
  @IsOptional()
  @IsBoolean()
  posterUploaded?: boolean;
}
