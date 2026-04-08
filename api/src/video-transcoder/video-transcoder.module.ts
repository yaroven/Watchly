import { BullModule } from "@nestjs/bullmq";
import { forwardRef, Module } from "@nestjs/common";
import { EpisodeModule } from "src/episode/episode.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { S3Module } from "src/S3/S3.module";
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
    forwardRef(() => EpisodeModule),
  ],
  controllers: [VideoTranscoderController],
  providers: [VideoTranscoderService, VideoTranscoderProcessor],
  exports: [VideoTranscoderService],
})
export class VideoTranscoderModule {}
