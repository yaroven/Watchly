import { RegisterQueueOptions } from "@nestjs/bullmq";

export const AVATAR_QUEUE_NAME = "user-avatar";
export const AVATAR_JOB_NAME = "process-avatar";

export interface ProcessAvatarJob {
  userId: string;
  /** Key of the uploaded original in the raw bucket. */
  rawKey: string;
}

export const AVATAR_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: AVATAR_QUEUE_NAME,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: { count: 1000 },
  },
};
