import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { JobContext } from "../../../decorators/job-context.decorator";
import { Logged } from "../../../decorators/logged.decorator";
import { EngagementCountersService } from "../../engagement/engagement-counters.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ReactionService } from "../../reaction/reaction.service";
import { targetOf } from "../../reaction/utils/reaction-target.const";
import { rowVote } from "../../reaction/utils/vote.query";
import { VoteStateService } from "../../vote-cache/vote-state.service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly voteState: VoteStateService,
    private readonly reactions: ReactionService,
    private readonly counters: EngagementCountersService,
    private readonly scheduler: ReactionFlushScheduler,
  ) {
    super();
  }

  @JobContext()
  @Logged()
  async process(job: Job<ReactionFlushQueueJob>): Promise<void> {
    if (job.name === REACTION_RECOUNT_JOB_NAME) {
      await this.recount(job.data);
    } else {
      await this.flush(job.data as FlushVoteJob);
    }
  }

  @Logged()
  private async flush({ arc, subjectId, userId }: FlushVoteJob): Promise<void> {
    const target = targetOf(arc, subjectId);

    const cached = await this.voteState.get(target, userId);
    const vote = cached ?? (await rowVote(this.prisma, target, userId));

    await this.reactions.writeVote(this.prisma, target, userId, vote);
    await this.scheduler.scheduleRecount(target);
  }

  @Logged()
  private async recount({ arc, subjectId }: RecountSubjectJob): Promise<void> {
    await this.counters.recomputeReactions(targetOf(arc, subjectId), this.prisma);
  }
}
