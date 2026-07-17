import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateSeasonDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  titleId: string;
}
