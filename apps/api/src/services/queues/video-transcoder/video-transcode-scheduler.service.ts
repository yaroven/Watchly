import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { Logged } from "../../../decorators/logged.decorator";
import { VideoType } from "./enums/video-type.enum";
import {
  VIDEO_TRANSCODE_JOB_NAME,
  VIDEO_TRANSCODE_QUEUE_NAME,
} from "./video-transcode-queue.options";
import { TranscodeVideoJob } from "./video-transcoder.types";

@Injectable()
export class VideoTranscodeScheduler {
  constructor(@InjectQueue(VIDEO_TRANSCODE_QUEUE_NAME) private readonly queue: Queue) {}

  private jobId({ id, type }: TranscodeVideoJob): string {
    return `transcode-${type}-${id}`;
  }

  @Logged()
  async schedule(payload: TranscodeVideoJob): Promise<void> {
    await this.queue.add(VIDEO_TRANSCODE_JOB_NAME, payload, { jobId: this.jobId(payload) });
  }

  @Logged()
  async cancelScheduled(id: string, type: VideoType): Promise<void> {
    const cancellableStates = ["waiting", "delayed", "prioritized", "waiting-children"];
    const job = await this.queue.getJob(this.jobId({ id, type }));
    if (!job) return;

    const state = await job.getState();
    if (cancellableStates.includes(state)) {
      await job.remove();
    }
  }
}
