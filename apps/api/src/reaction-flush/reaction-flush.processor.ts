import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import logJobFailure from "../common/utils/log-job-failure.util";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionService } from "../reaction/reaction.service";
import { targetOf } from "../reaction/utils/reaction-target.const";
import { rowVote } from "../reaction/utils/vote.query";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { FlushVoteJob, REACTION_FLUSH_QUEUE_NAME } from "./reaction-flush-queue.options";

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
      const cached = await this.voteState.get(target, userId);
      const vote = cached ?? (await rowVote(this.prisma, target, userId));

      await this.prisma.$transaction((tx) =>
        this.reactions.applyAbsolute(tx, target, userId, vote),
      );
    } catch (error) {
      logJobFailure(this.logger, `Flushing a vote on ${arc} ${subjectId}`, error);
      throw error;
    }
  }
}
