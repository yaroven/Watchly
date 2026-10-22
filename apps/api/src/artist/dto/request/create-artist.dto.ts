import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateArtistDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description:
      "False clears the photo. True is accepted and ignored: the upload goes to the raw bucket and the transcoding worker records the converted image on the artist once it lands, so a new photo appears on a later read rather than in this response.",
  })
  @IsOptional()
  @IsBoolean()
  photoUploaded?: boolean;
}
