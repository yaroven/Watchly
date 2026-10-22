import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "./video-transcode-queue.options";
import { VideoTranscodeScheduler } from "./video-transcode-scheduler.service";
import { VideoTranscodeStateService } from "./video-transcode-state.service";
import { VideoTranscoderController } from "./video-transcoder.controller";

@Module({
  imports: [BullModule.registerQueue(VIDEO_TRANSCODE_QUEUE_OPTIONS), PrismaModule],
  controllers: [VideoTranscoderController],
  providers: [VideoTranscodeScheduler, VideoTranscodeStateService],
  exports: [VideoTranscodeScheduler, VideoTranscodeStateService, BullModule],
})
export class VideoTranscoderModule {}
