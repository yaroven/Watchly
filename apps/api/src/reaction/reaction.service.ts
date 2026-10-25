import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import {
  CountersSubject,
  EngagementCountersService,
  EngagementCounts,
} from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionFlushScheduler } from "../reaction-flush/reaction-flush-scheduler.service";
import { RedisUnavailableError } from "../redis/redis.error";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { ReactionTarget, reactionWhereUnique } from "./utils/reaction-target.const";
import { Vote, voteDelta } from "./utils/vote.util";

export type ReactionClient = Pick<PrismaService, "reaction" | "engagementCounters" | "comment">;

export type ReactionResult = EngagementCounts & { myReaction: Vote };

const countersSubject = (target: ReactionTarget): CountersSubject => target;

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
    private readonly voteState: VoteStateService,
    private readonly flush: ReactionFlushScheduler,
  ) {}

  async assertSubjectExists(target: ReactionTarget): Promise<void> {
    if ("titleId" in target) {
      const title = await this.prisma.title.findUnique({
        where: { id: target.titleId },
        select: { id: true },
      });
      if (!title) throw new NotFoundException(`Title with id ${target.titleId} not found`);
      return;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: target.commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${target.commentId} not found`);
  }

  /**
   * Sets the viewer's vote to `type`, whatever they held before.
   *
   * Absolute, not a toggle: the request says what the vote should be, because
   * the client already knows what it is showing. Sending the same vote twice
   * is the same as sending it once, and no part of the server has to work out
   * what was held in order to know what is wanted.
   */
  async setVote(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.cast(target, userId, type);
  }

  /** Sets it to no vote at all. The same operation, with a different value. */
  async clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult> {
    return this.cast(target, userId, null);
  }

  /**
   * Writes the vote a pair holds, whatever it holds — the flush's half of the
   * arrangement, and the reason the processor can work its jobs in any order.
   * Absolute rather than a toggle: applying it twice is applying it once, and
   * applying a stale one is impossible because the state is read at flush time
   * rather than carried in the job.
   *
   * Takes a client so the row and the counter that summarises it commit
   * together, the way `EngagementCountersService` expects to be called.
   */
  async applyAbsolute(
    client: ReactionClient,
    target: ReactionTarget,
    userId: string,
    vote: Vote,
  ): Promise<void> {
    if (vote === null) {
      await client.reaction.deleteMany({ where: { ...target, userId } });
    } else {
      await client.reaction.upsert({
        where: reactionWhereUnique(target, userId),
        create: { ...target, userId, type: vote },
        update: { type: vote },
      });
    }

    await this.counters.recomputeReactions(countersSubject(target), client);
  }

  /**
   * The counts come from the last flush, so the vote just cast is not in them
   * yet — adding this request's own delta is what keeps `myReaction` and the
   * number beside it from contradicting each other for the one caller who
   * already knows what they did. Everyone else sees it after the flush.
   */
  private async cast(target: ReactionTarget, userId: string, vote: Vote): Promise<ReactionResult> {
    const previous = await this.record(target, userId, vote);
    const delta = voteDelta(previous, vote);
    const stored = await this.counters.countsForOne(countersSubject(target), this.prisma);

    return {
      ...stored,
      // Clamped because the two numbers come from different moments: a
      // withdrawal whose vote was never flushed would otherwise read as -1.
      likes: Math.max(0, stored.likes + delta.likes),
      dislikes: Math.max(0, stored.dislikes + delta.dislikes),
      myReaction: vote,
    };
  }

  /**
   * The job is scheduled *before* the vote is written, which is only sound
   * because the job is a pointer: one that fires against an unwritten vote
   * mirrors the state already in place and does nothing. The other order would
   * leave a vote cached, visible on reads and never persisted if the enqueue
   * failed — and it would revert on its own a week later, when the key expires.
   *
   * Redis being down is a 503 rather than a 500: nothing is wrong with the
   * request, and accepting a vote there is nowhere to put would be worse than
   * refusing it.
   */
  private async record(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote> {
    try {
      await this.flush.schedule(target, userId);

      return await this.voteState.set(target, userId, vote);
    } catch (error) {
      if (!(error instanceof RedisUnavailableError)) throw error;

      this.logger.error(`Refusing a vote: ${error.message}`, error.stack);
      throw new ServiceUnavailableException("Reacting is temporarily unavailable");
    }
  }
}
