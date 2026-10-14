import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { UserAvatarController } from "./user-avatar.controller";
import { UserAvatarService } from "./user-avatar.service";

@Module({
  imports: [S3Module, PrismaModule],
  controllers: [UserAvatarController],
  providers: [UserAvatarService],
  exports: [UserAvatarService],
})
export class UserAvatarModule {}
