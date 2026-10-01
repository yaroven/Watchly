import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { AVATAR_ALLOWED_UPLOAD_TYPES } from "../../avatar-image.const";

export class CreateAvatarUploadUrlDto {
  @ApiProperty({ enum: AVATAR_ALLOWED_UPLOAD_TYPES, description: "Content type of the original" })
  @IsIn(AVATAR_ALLOWED_UPLOAD_TYPES)
  contentType: string;
}
