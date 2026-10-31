import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { Logged } from "../../../decorators/logged.decorator";
import { ImageKind } from "./image-profile.const";
import {
  IMAGE_TRANSCODE_JOB_NAME,
  IMAGE_TRANSCODE_QUEUE_NAME,
  TranscodeImageJob,
} from "./image-transcode-queue.options";

@Injectable()
export class ImageTranscodeScheduler {
  constructor(
    @InjectQueue(IMAGE_TRANSCODE_QUEUE_NAME) private readonly queue: Queue<TranscodeImageJob>,
  ) {}

  @Logged()
  async schedule({
    kind,
    ownerId,
    rawKey,
  }: {
    kind: ImageKind;
    ownerId: string;
    rawKey: string;
  }): Promise<void> {
    await this.queue.add(
      IMAGE_TRANSCODE_JOB_NAME,
      { kind, ownerId, rawKey },
      { jobId: `image-${rawKey}` },
    );
  }
}
