import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import {
  ImageKind,
  imageProfile,
} from "../../../../../services/queues/image-transcoder/image-profile.const";

const ALLOWED = imageProfile(ImageKind.USER_AVATAR).allowedUploadTypes;

export class CreateAvatarUploadUrlDto {
  @ApiProperty({ enum: ALLOWED, description: "Content type of the original" })
  @IsIn(ALLOWED)
  contentType: string;
}
