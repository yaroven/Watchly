import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { VideoTranscoderProcessor } from "./video-transcoder-processor";
import { VideoTranscoderController } from "./video-transcoder.controller";
import { VideoTranscoderService } from "./video-transcoder.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "video-transcode",
      defaultJobOptions: {
        priority: 1,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    S3Module,
    PrismaModule,
  ],
  controllers: [VideoTranscoderController],
  providers: [VideoTranscoderService, VideoTranscoderProcessor],
  exports: [VideoTranscoderService],
})
export class VideoTranscoderModule {}
