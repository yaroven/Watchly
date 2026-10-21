import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "./video-transcode-queue.options";
import { VideoTranscoderController } from "./video-transcoder.controller";
import { VideoTranscoderService } from "./video-transcoder.service";

@Module({
  imports: [BullModule.registerQueue(VIDEO_TRANSCODE_QUEUE_OPTIONS), S3Module, PrismaModule],
  controllers: [VideoTranscoderController],
  providers: [VideoTranscoderService],
  // BullModule is exported so the queue token resolves outside this module.
  // Registration still belongs to the transcoder that owns the queue; what
  // leaves here is read access, which is all QueueMetricsService wants.
  exports: [VideoTranscoderService, BullModule],
})
export class VideoTranscoderModule {}
