import { Body, Controller, Delete, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { CreateAvatarUploadUrlDto } from "./dto/request/create-avatar-upload-url.dto";
import { AvatarUploadUrlDto } from "./dto/response/avatar-upload-url.dto";
import { UserAvatarService } from "./user-avatar.service";

@ApiTags("users")
@Controller("user/me/avatar")
export class UserAvatarController {
  constructor(private readonly userAvatarService: UserAvatarService) {}

  @ApiOperation({
    summary: "Get a URL to upload a new avatar to",
    description:
      "PUT the image to the returned URL. Processing is asynchronous: the avatar appears on the user once the worker has converted it, so re-read the user rather than assuming it is immediate.",
  })
  @ApiOkResponse({ type: AvatarUploadUrlDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post("upload-url")
  createUploadUrl(
    @Body() { contentType }: CreateAvatarUploadUrlDto,
    @CurrentUserId() userId: string,
  ) {
    return this.userAvatarService.createUploadUrl(userId, contentType);
  }

  @ApiOperation({ summary: "Remove your avatar" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@CurrentUserId() userId: string) {
    return this.userAvatarService.remove(userId);
  }
}
