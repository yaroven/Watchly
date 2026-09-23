import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CastCreditInputDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  artistId: string;

  @ApiProperty({ required: false, maxLength: 255, description: "Character/role played" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  character?: string;

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
