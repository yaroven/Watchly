import { ApiProperty } from "@nestjs/swagger";
import { AvatarUploadUrl } from "../../../../../services/user-avatar/user-avatar.types";

export class AvatarUploadUrlDto implements AvatarUploadUrl {
  @ApiProperty({ description: "Presigned PUT URL for the original image" })
  uploadUrl: string;

  @ApiProperty({ description: "Key the original will land on in the raw bucket" })
  rawKey: string;

  @ApiProperty({ description: "Uploads larger than this are rejected by the worker" })
  maxBytes: number;
}
