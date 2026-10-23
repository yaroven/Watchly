import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import logJobFailure from "../common/utils/log-job-failure.util";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionService } from "../reaction/reaction.service";
import { targetOf } from "../reaction/utils/reaction-target.const";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { FlushVoteJob, REACTION_FLUSH_QUEUE_NAME } from "./reaction-flush-queue.options";

/**
 * Mirrors one (subject, viewer) pair from the cache onto the rows.
 *
 * It reads the state rather than receiving it, so the work is idempotent and
 * order-free: whatever the cache holds when this runs is what Postgres ends up
 * with. A job whose key has since expired reads the row, finds it unchanged and
 * writes it back — a wasted transaction, not a wrong one.
 */
@Processor(REACTION_FLUSH_QUEUE_NAME, {
  concurrency: Number(process.env.REACTION_FLUSH_CONCURRENCY) || 8,
})
export class ReactionFlushProcessor extends WorkerHost {
  private readonly logger = new Logger(ReactionFlushProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voteState: VoteStateService,
    private readonly reactions: ReactionService,
  ) {
    super();
  }

  async process(job: Job<FlushVoteJob>): Promise<void> {
    const { arc, subjectId, userId } = job.data;
    const target = targetOf(arc, subjectId);

    try {
      const vote = await this.voteState.read(target, userId);

      await this.prisma.$transaction((tx) =>
        this.reactions.applyAbsolute(tx, target, userId, vote),
      );
    } catch (error) {
      // Rethrown so BullMQ retries and the failure shows in the queue's own
      // counts, which is the only place the api can see it from.
      logJobFailure(this.logger, `Flushing a vote on ${arc} ${subjectId}`, error);
      throw error;
    }
  }
}
