import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class StartMultipartUploadDto {
  @ApiProperty({ minimum: 1, description: "Size in bytes of the file about to be uploaded" })
  @IsInt()
  @Min(1)
  fileSize: number;
}
