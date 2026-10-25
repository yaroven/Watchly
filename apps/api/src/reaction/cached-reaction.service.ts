import { Injectable, Logger } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import {
  CountersSubject,
  EngagementCountersService,
} from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionFlushScheduler } from "../reaction-flush/reaction-flush-scheduler.service";
import { RedisUnavailableError } from "../redis/redis.error";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { ReactionService } from "./reaction.service";
import { ReactionResult, Reactions } from "./reaction.types";
import { ReactionTarget } from "./utils/reaction-target.const";
import { Vote, voteDelta } from "./utils/vote.util";

const countersSubject = (target: ReactionTarget): CountersSubject => target;

/**
 * `ReactionService` with the cache in front of it: the vote lands in Redis, a
 * pointer at the pair goes on the queue, and the answer is the last flushed
 * counts corrected by this request's own change. The row is written later, by
 * the flush processor.
 *
 * **Redis being unreachable delegates to the service it wraps**, which writes
 * the row synchronously the way the API did before any of this existed. Votes
 * keep working through a Redis outage, and the cost is narrow: the fallback
 * cannot see a vote that is still only in Redis, so a pair the same viewer
 * touched inside the flush window at the moment Redis died answers from a row
 * that is a beat behind. That used to produce a *wrong* vote, when the server
 * inferred intent from what it read; now the request names the vote outright,
 * so the stale read costs only the counts in the response.
 *
 * Nothing is written to the cache on that path. A key left absent means
 * "unknown", so the next read goes to the row the fallback just wrote — which
 * is why falling back cannot leave the two disagreeing.
 */
@Injectable()
export class CachedReactionService implements Reactions {
  private readonly logger = new Logger(CachedReactionService.name);

  constructor(
    private readonly direct: ReactionService,
    private readonly voteState: VoteStateService,
    private readonly flush: ReactionFlushScheduler,
    private readonly counters: EngagementCountersService,
    private readonly prisma: PrismaService,
  ) {}

  async assertSubjectExists(target: ReactionTarget): Promise<void> {
    return this.direct.assertSubjectExists(target);
  }

  async setVote(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.cast(target, userId, type, () => this.direct.setVote(target, userId, type));
  }

  async clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult> {
    return this.cast(target, userId, null, () => this.direct.clearVote(target, userId));
  }

  private async cast(
    target: ReactionTarget,
    userId: string,
    vote: Vote,
    withoutCache: () => Promise<ReactionResult>,
  ): Promise<ReactionResult> {
    let previous: Vote;

    try {
      previous = await this.record(target, userId, vote);
    } catch (error) {
      if (!(error instanceof RedisUnavailableError)) throw error;

      this.logger.warn(`Writing a vote straight to Postgres: ${error.message}`);
      return withoutCache();
    }

    return this.answer(target, previous, vote);
  }

  /**
   * The job is scheduled *before* the vote is written, which is only sound
   * because the job is a pointer: one that fires against an unwritten vote
   * mirrors the state already in place and does nothing. The other order would
   * leave a vote cached, visible on reads and never persisted if the enqueue
   * failed — and it would revert on its own a week later, when the key expires.
   */
  private async record(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote> {
    await this.flush.schedule(target, userId);

    return this.voteState.set(target, userId, vote);
  }

  /**
   * The counts come from the last flush, so the vote just cast is not in them
   * yet — adding this request's own delta is what keeps `myReaction` and the
   * number beside it from contradicting each other for the one caller who
   * already knows what they did. Everyone else sees it after the flush.
   */
  private async answer(
    target: ReactionTarget,
    previous: Vote,
    vote: Vote,
  ): Promise<ReactionResult> {
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
}
