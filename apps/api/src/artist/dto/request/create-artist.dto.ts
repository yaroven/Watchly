import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateArtistDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description:
      "True once the image has been PUT to the upload URL. The key is derived from the artist, so no URL is sent; the server checks the object is there before storing it. False clears the photo.",
  })
  @IsOptional()
  @IsBoolean()
  photoUploaded?: boolean;
}
