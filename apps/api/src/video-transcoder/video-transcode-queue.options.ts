import { RegisterQueueOptions } from "@nestjs/bullmq";
import { DEFAULT_JOB_OPTIONS } from "../common/utils/job-queue.const";

export const VIDEO_TRANSCODE_QUEUE_NAME = "video-transcode";

export const VIDEO_TRANSCODE_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: VIDEO_TRANSCODE_QUEUE_NAME,
  defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, priority: 1 },
};
