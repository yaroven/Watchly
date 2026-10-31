import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { ImageUploadInput } from "../../../../../services/image/image.types";
import { IMAGE_UPLOAD_TYPES } from "../../../../../services/queues/image-transcoder/image-profile.const";

export class CreateImageUploadUrlDto implements ImageUploadInput {
  @ApiProperty({
    enum: IMAGE_UPLOAD_TYPES,
    description:
      "Content type of the original. The upload URL is signed for it, so the PUT must send the same Content-Type header.",
  })
  @IsIn(IMAGE_UPLOAD_TYPES)
  contentType: string;
}
