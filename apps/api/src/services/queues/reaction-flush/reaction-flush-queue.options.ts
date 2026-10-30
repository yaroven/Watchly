import { RegisterQueueOptions } from "@nestjs/bullmq";
import { ReactionArc } from "../../reaction/enums/reaction-arc.enum";
import { DEFAULT_JOB_OPTIONS } from "../utils/job-queue.const";

export const REACTION_FLUSH_QUEUE_NAME = "reaction-flush";
export const REACTION_FLUSH_JOB_NAME = "flush-vote";

export interface FlushVoteJob {
  arc: ReactionArc;
  subjectId: string;
  userId: string;
}

export const FLUSH_DELAY_MS = 2_000;

export const flushDeduplicationId = (arc: ReactionArc, subjectId: string, userId: string): string =>
  `vote-${arc}-${subjectId}-${userId}`;

export const FLUSH_DEDUPLICATION = { keepLastIfActive: true } as const;
export const REACTION_FLUSH_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: REACTION_FLUSH_QUEUE_NAME,
  defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, delay: FLUSH_DELAY_MS },
};
