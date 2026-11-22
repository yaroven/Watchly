import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { NameDescriptionTranslation, NameTranslation } from "../../../common/translation.types";

export class NameDescriptionTranslationDto implements NameDescriptionTranslation {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;
}

export class GenreTranslationDto implements NameTranslation {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;
}
