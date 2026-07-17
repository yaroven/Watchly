import { RegisterQueueOptions } from "@nestjs/bullmq";

export const VIDEO_TRANSCODE_QUEUE_NAME = "video-transcode";

export const VIDEO_TRANSCODE_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: VIDEO_TRANSCODE_QUEUE_NAME,
  defaultJobOptions: {
    priority: 1,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: { count: 1000 },
  },
};
