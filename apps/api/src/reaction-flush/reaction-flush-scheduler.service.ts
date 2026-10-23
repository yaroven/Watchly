import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { arcOf, ReactionTarget, subjectIdOf } from "../reaction/utils/reaction-target.const";
import { throughRedis } from "../redis/redis.error";
import {
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
   * The `jobId` is the pair, so a burst of clicks adds one job and the rest
   * return it — the dedup window is the job's delay. The convention lives here
   * rather than at the call site for the same reason `image-<rawKey>` does.
   */
  async schedule(target: ReactionTarget, userId: string): Promise<void> {
    const arc = arcOf(target);
    const subjectId = subjectIdOf(target);

    await throughRedis("schedule a flush", () =>
      this.queue.add(
        REACTION_FLUSH_JOB_NAME,
        { arc, subjectId, userId },
        { jobId: `vote-${arc}-${subjectId}-${userId}` },
      ),
    );
  }
}
