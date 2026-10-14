import { Injectable } from "@nestjs/common";
import { ImageKind } from "../image-transcoder/image-profile.const";
import { ProcessedImageAttacher } from "../image-transcoder/processed-image-attacher";
import { buildAvatarKey, UserAvatarService } from "./user-avatar.service";

@Injectable()
export class AvatarImageAttacher implements ProcessedImageAttacher {
  readonly kind = ImageKind.USER_AVATAR;

  constructor(private readonly userAvatarService: UserAvatarService) {}

  buildKey(userId: string, version: string): string {
    return buildAvatarKey(userId, version);
  }

  async attach(userId: string, key: string): Promise<void> {
    await this.userAvatarService.attachProcessedAvatar(userId, key);
  }
}
