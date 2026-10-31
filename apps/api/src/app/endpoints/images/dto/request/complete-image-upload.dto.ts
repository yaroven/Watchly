import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CompleteImageUploadDto {
  @ApiProperty({ description: "The rawKey the upload URL was issued for" })
  @IsString()
  @IsNotEmpty()
  rawKey: string;
}
