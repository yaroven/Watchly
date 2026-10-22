import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { ImageKind } from "./image-profile.const";
import {
  IMAGE_TRANSCODE_JOB_NAME,
  IMAGE_TRANSCODE_QUEUE_NAME,
  TranscodeImageJob,
} from "./image-transcode-queue.options";

@Injectable()
export class ImageTranscodeScheduler {
  private readonly logger = new Logger(ImageTranscodeScheduler.name);

  constructor(
    @InjectQueue(IMAGE_TRANSCODE_QUEUE_NAME) private readonly queue: Queue<TranscodeImageJob>,
  ) {}

  async schedule({
    kind,
    ownerId,
    rawKey,
  }: {
    kind: ImageKind;
    ownerId: string;
    rawKey: string;
  }): Promise<void> {
    this.logger.log(`Scheduling ${kind} conversion for ${ownerId}`);

    await this.queue.add(
      IMAGE_TRANSCODE_JOB_NAME,
      { kind, ownerId, rawKey },
      { jobId: `image-${rawKey}` },
    );
  }
}
