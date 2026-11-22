import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  CastCreditInput,
  CharacterTranslations,
} from "../../../../../services/title-cast/title-cast.types";

export class CharacterTranslationsDto implements CharacterTranslations {
  @ApiProperty({ required: false, maxLength: 255, description: "Character name in Ukrainian" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  uk?: string;
}

export class CastCreditInputDto implements CastCreditInput {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  artistId: string;

  @ApiProperty({ required: false, maxLength: 255, description: "Character/role played" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  character?: string;

  @ApiProperty({
    required: false,
    type: CharacterTranslationsDto,
    description:
      "Character name per non-English locale. Resend it on every cast save: a save replaces each credit.",
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CharacterTranslationsDto)
  characterTranslations?: CharacterTranslationsDto;

  @ApiProperty({ required: false, minimum: 0, description: "Defaults to array position" })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class SetTitleCastDto {
  @ApiProperty({ type: [CastCreditInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CastCreditInputDto)
  credits: CastCreditInputDto[];
}
