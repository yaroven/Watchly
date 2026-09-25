import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsString, Min, ValidateNested } from "class-validator";

export class UploadedPartDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  partNumber: number;

  @ApiProperty({ description: "The `ETag` response header S3 returned for this part's PUT" })
  @IsString()
  eTag: string;
}

export class CompleteMultipartUploadDto {
  @ApiProperty()
  @IsString()
  uploadId: string;

  @ApiProperty({ type: [UploadedPartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadedPartDto)
  parts: UploadedPartDto[];
}
