import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { AVATAR_QUEUE_OPTIONS } from "./avatar-queue.options";
import { UserAvatarController } from "./user-avatar.controller";
import { UserAvatarService } from "./user-avatar.service";

/** Producer side: hands out upload URLs and enqueues. The processor lives in the worker. */
@Module({
  imports: [S3Module, PrismaModule, BullModule.registerQueue(AVATAR_QUEUE_OPTIONS)],
  controllers: [UserAvatarController],
  providers: [UserAvatarService],
  exports: [UserAvatarService],
})
export class UserAvatarModule {}
