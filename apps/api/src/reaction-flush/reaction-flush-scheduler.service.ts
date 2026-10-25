import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { arcOf, ReactionTarget, subjectIdOf } from "../reaction/utils/reaction-target.const";
import { throughRedis } from "../redis/redis.error";
import {
  FLUSH_DEDUPLICATION,
  flushDeduplicationId,
  FlushVoteJob,
  REACTION_FLUSH_JOB_NAME,
  REACTION_FLUSH_QUEUE_NAME,
} from "./reaction-flush-queue.options";

@Injectable()
export class ReactionFlushScheduler {
  constructor(
    @InjectQueue(REACTION_FLUSH_QUEUE_NAME) private readonly queue: Queue<FlushVoteJob>,
  ) {}

  /**
   * Says that a pair needs mirroring, without saying what it now holds.
   *
   * Deduplicated on the pair, so a burst of clicks costs one write and the job
   * reads the final state when it runs. The convention lives here rather than
   * at the call site, for the same reason `image-<rawKey>` does.
   */
  async schedule(target: ReactionTarget, userId: string): Promise<void> {
    const arc = arcOf(target);
    const subjectId = subjectIdOf(target);

    await throughRedis("schedule a flush", () =>
      this.queue.add(
        REACTION_FLUSH_JOB_NAME,
        { arc, subjectId, userId },
        {
          deduplication: {
            ...FLUSH_DEDUPLICATION,
            id: flushDeduplicationId(arc, subjectId, userId),
          },
        },
      ),
    );
  }
}
