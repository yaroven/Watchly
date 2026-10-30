import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { arcOf, ReactionTarget, subjectIdOf } from "../../reaction/utils/reaction-target.const";
import { throughRedis } from "../../redis/redis.error";
import {
  FLUSH_DEDUPLICATION,
  flushDeduplicationId,
  REACTION_FLUSH_JOB_NAME,
  REACTION_FLUSH_QUEUE_NAME,
  REACTION_RECOUNT_JOB_NAME,
  ReactionFlushQueueJob,
  recountDeduplicationId,
} from "./reaction-flush-queue.options";

@Injectable()
export class ReactionFlushScheduler {
  constructor(
    @InjectQueue(REACTION_FLUSH_QUEUE_NAME) private readonly queue: Queue<ReactionFlushQueueJob>,
  ) {}

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

  async scheduleRecount(target: ReactionTarget): Promise<void> {
    const arc = arcOf(target);
    const subjectId = subjectIdOf(target);

    await throughRedis("schedule a recount", () =>
      this.queue.add(
        REACTION_RECOUNT_JOB_NAME,
        { arc, subjectId },
        {
          deduplication: {
            ...FLUSH_DEDUPLICATION,
            id: recountDeduplicationId(arc, subjectId),
          },
        },
      ),
    );
  }
}
