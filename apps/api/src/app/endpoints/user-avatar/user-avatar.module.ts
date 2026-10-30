import { Module } from "@nestjs/common";
import { UserAvatarModule } from "../../../services/user-avatar/user-avatar.module";
import { UserAvatarController } from "./user-avatar.controller";

@Module({
  imports: [UserAvatarModule],
  controllers: [UserAvatarController],
})
export class UserAvatarEndpointModule {}
