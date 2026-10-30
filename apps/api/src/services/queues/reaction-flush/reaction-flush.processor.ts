import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { EngagementCountersService } from "../../engagement/engagement-counters.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ReactionService } from "../../reaction/reaction.service";
import { targetOf } from "../../reaction/utils/reaction-target.const";
import { rowVote } from "../../reaction/utils/vote.query";
import { VoteStateService } from "../../vote-cache/vote-state.service";
import logJobFailure from "../utils/log-job-failure.util";
import {
  FlushVoteJob,
  REACTION_FLUSH_QUEUE_NAME,
  REACTION_RECOUNT_JOB_NAME,
  ReactionFlushQueueJob,
  RecountSubjectJob,
} from "./reaction-flush-queue.options";
import { ReactionFlushScheduler } from "./reaction-flush-scheduler.service";

@Processor(REACTION_FLUSH_QUEUE_NAME, {
  concurrency: Number(process.env.REACTION_FLUSH_CONCURRENCY) || 8,
})
export class ReactionFlushProcessor extends WorkerHost {
  private readonly logger = new Logger(ReactionFlushProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voteState: VoteStateService,
    private readonly reactions: ReactionService,
    private readonly counters: EngagementCountersService,
    private readonly scheduler: ReactionFlushScheduler,
  ) {
    super();
  }

  async process(job: Job<ReactionFlushQueueJob>): Promise<void> {
    const { arc, subjectId } = job.data;

    try {
      if (job.name === REACTION_RECOUNT_JOB_NAME) {
        await this.recount(job.data);
      } else {
        await this.flush(job.data as FlushVoteJob);
      }
    } catch (error) {
      logJobFailure(this.logger, `Running ${job.name} on ${arc} ${subjectId}`, error);
      throw error;
    }
  }

  private async flush({ arc, subjectId, userId }: FlushVoteJob): Promise<void> {
    const target = targetOf(arc, subjectId);

    const cached = await this.voteState.get(target, userId);
    const vote = cached ?? (await rowVote(this.prisma, target, userId));

    await this.reactions.writeVote(this.prisma, target, userId, vote);
    await this.scheduler.scheduleRecount(target);
  }

  private async recount({ arc, subjectId }: RecountSubjectJob): Promise<void> {
    await this.counters.recomputeReactions(targetOf(arc, subjectId), this.prisma);
  }
}
