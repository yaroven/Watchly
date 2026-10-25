import { Injectable, NotFoundException } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import {
  CountersSubject,
  EngagementCountersService,
  EngagementCounts,
} from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionResult, Reactions } from "./reaction.types";
import { ReactionTarget, reactionWhereUnique } from "./utils/reaction-target.const";
import { Vote } from "./utils/vote.util";

export type ReactionClient = Pick<PrismaService, "reaction" | "engagementCounters" | "comment">;

const countersSubject = (target: ReactionTarget): CountersSubject => target;

/**
 * Reacting with nothing in front of it: the row and the counter that summarises
 * it, written together in one transaction, and exact counts in the answer.
 *
 * This is both the fallback `CachedReactionService` delegates to when Redis is
 * unreachable and the writer the flush processor drives, which is why
 * `applyAbsolute` is public. It is also what the API behaved like before the
 * cache existed — slower on the hot path, and correct with nothing running but
 * Postgres.
 */
@Injectable()
export class ReactionService implements Reactions {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
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

  async setVote(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.write(target, userId, type);
  }

  async clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult> {
    return this.write(target, userId, null);
  }

  /**
   * Writes the vote a pair holds, whatever it holds.
   *
   * Absolute rather than a toggle: applying it twice is applying it once, and
   * applying a stale one is impossible because nothing here infers intent — the
   * value arrives either from the request or from the cache the flush is
   * mirroring.
   *
   * Takes a client so the row and the counter that summarises it commit
   * together, the way `EngagementCountersService` expects to be called.
   */
  async applyAbsolute(
    client: ReactionClient,
    target: ReactionTarget,
    userId: string,
    vote: Vote,
  ): Promise<EngagementCounts> {
    if (vote === null) {
      await client.reaction.deleteMany({ where: { ...target, userId } });
    } else {
      await client.reaction.upsert({
        where: reactionWhereUnique(target, userId),
        create: { ...target, userId, type: vote },
        update: { type: vote },
      });
    }

    return this.counters.recomputeReactions(countersSubject(target), client);
  }

  private async write(target: ReactionTarget, userId: string, vote: Vote): Promise<ReactionResult> {
    const counts = await this.prisma.$transaction((tx) =>
      this.applyAbsolute(tx, target, userId, vote),
    );

    return { ...counts, myReaction: vote };
  }
}
