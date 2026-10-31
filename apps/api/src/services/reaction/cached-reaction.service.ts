import { Injectable } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { Logged } from "../../decorators/logged.decorator";
import { countsOf, EngagementCounts } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionFlushScheduler } from "../queues/reaction-flush/reaction-flush-scheduler.service";
import { RedisUnavailableError } from "../redis/redis.error";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { ReactionService } from "./reaction.service";
import { ReactionResult, Reactions } from "./reaction.types";
import {
  ReactionTarget,
  subjectNotFound,
  subjectWithCounters,
} from "./utils/reaction-target.const";
import { rowVote } from "./utils/vote.query";
import { Vote, voteDelta } from "./utils/vote.util";

@Injectable()
export class CachedReactionService implements Reactions {
  constructor(
    private readonly direct: ReactionService,
    private readonly voteState: VoteStateService,
    private readonly flush: ReactionFlushScheduler,
    private readonly prisma: PrismaService,
  ) {}

  @Logged()
  async setVote(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.cast(target, userId, type, () => this.direct.setVote(target, userId, type));
  }

  @Logged()
  async clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult> {
    return this.cast(target, userId, null, () => this.direct.clearVote(target, userId));
  }

  @Logged()
  private async cast(
    target: ReactionTarget,
    userId: string,
    vote: Vote,
    withoutCache: () => Promise<ReactionResult>,
  ): Promise<ReactionResult> {
    const subject = await subjectWithCounters(this.prisma, target);
    if (!subject) throw subjectNotFound(target);

    let previous: Vote;

    try {
      previous = await this.record(target, userId, vote);
    } catch (error) {
      if (!(error instanceof RedisUnavailableError)) throw error;

      return withoutCache();
    }

    return this.answer(countsOf(subject.counters), previous, vote);
  }

  @Logged({
    failedLevel: (error) => (error instanceof RedisUnavailableError ? "warn" : "error"),
  })
  private async record(target: ReactionTarget, userId: string, vote: Vote): Promise<Vote> {
    await this.flush.schedule(target, userId);

    const displaced = await this.voteState.set(target, userId, vote);

    return displaced ?? (await rowVote(this.prisma, target, userId));
  }

  private answer(stored: EngagementCounts, previous: Vote, vote: Vote): ReactionResult {
    const delta = voteDelta(previous, vote);

    return {
      ...stored,
      likes: Math.max(0, stored.likes + delta.likes),
      dislikes: Math.max(0, stored.dislikes + delta.dislikes),
      myReaction: vote,
    };
  }
}
