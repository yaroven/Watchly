import { RegisterQueueOptions } from "@nestjs/bullmq";
import { DEFAULT_JOB_OPTIONS } from "../utils/job-queue.const";
import { ImageKind } from "./image-profile.const";

export const IMAGE_TRANSCODE_QUEUE_NAME = "image-transcode";
export const IMAGE_TRANSCODE_JOB_NAME = "transcode-image";

export interface TranscodeImageJob {
  kind: ImageKind;
  ownerId: string;
  rawKey: string;
}

export const IMAGE_TRANSCODE_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: IMAGE_TRANSCODE_QUEUE_NAME,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};
