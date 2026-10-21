import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { TranscodeVideoDto } from "./dto/request/transcode-video.dto";
import { VideoType } from "./enums/video-type.enum";
import {
  VIDEO_TRANSCODE_JOB_NAME,
  VIDEO_TRANSCODE_QUEUE_NAME,
} from "./video-transcode-queue.options";

@Injectable()
export class VideoTranscodeScheduler {
  private readonly logger = new Logger(VideoTranscodeScheduler.name);

  constructor(@InjectQueue(VIDEO_TRANSCODE_QUEUE_NAME) private readonly queue: Queue) {}

  private jobId({ id, type }: TranscodeVideoDto): string {
    return `transcode-${type}-${id}`;
  }

  async schedule(payload: TranscodeVideoDto): Promise<void> {
    this.logger.log(`Scheduling ${VideoType[payload.type]} transcode for ${payload.id}`);

    await this.queue.add(VIDEO_TRANSCODE_JOB_NAME, payload, { jobId: this.jobId(payload) });
  }

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
