import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { IMAGE_TRANSCODE_QUEUE_OPTIONS } from "./image-transcode-queue.options";
import { ImageTranscodeScheduler } from "./image-transcode-scheduler.service";

@Module({
  imports: [BullModule.registerQueue(IMAGE_TRANSCODE_QUEUE_OPTIONS)],
  providers: [ImageTranscodeScheduler],
  exports: [ImageTranscodeScheduler],
})
export class ImageTranscoderModule {}
