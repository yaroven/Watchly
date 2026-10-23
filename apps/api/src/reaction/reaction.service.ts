import { Injectable, NotFoundException } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import {
  CountersSubject,
  EngagementCountersService,
  EngagementCounts,
} from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionTarget, reactionWhereUnique } from "./utils/reaction-target.const";

export type ReactionClient = Pick<PrismaService, "reaction" | "engagementCounters" | "comment">;

const countersSubject = (target: ReactionTarget): CountersSubject => target;

@Injectable()
export class ReactionService {
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

  async vote(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<EngagementCounts & { myReaction: ReactionType | null }> {
    return this.prisma.$transaction((tx) => this.voteWithin(tx, target, userId, type));
  }

  async unvote(
    target: ReactionTarget,
    userId: string,
  ): Promise<EngagementCounts & { myReaction: ReactionType | null }> {
    return this.prisma.$transaction((tx) => this.unvoteWithin(tx, target, userId));
  }

  async voteWithin(
    client: ReactionClient,
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<EngagementCounts & { myReaction: ReactionType | null }> {
    const myReaction = await this.toggle(target, userId, type, client);
    const counts = await this.counters.recomputeReactions(countersSubject(target), client);

    return { ...counts, myReaction };
  }

  async unvoteWithin(
    client: ReactionClient,
    target: ReactionTarget,
    userId: string,
  ): Promise<EngagementCounts & { myReaction: ReactionType | null }> {
    await client.reaction.deleteMany({ where: { ...target, userId } });
    const counts = await this.counters.recomputeReactions(countersSubject(target), client);

    return { ...counts, myReaction: null };
  }

  private async toggle(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
    client: ReactionClient,
  ): Promise<ReactionType | null> {
    const { count: withdrawn } = await client.reaction.deleteMany({
      where: { ...target, userId, type },
    });

    if (withdrawn > 0) return null;

    await client.reaction.upsert({
      where: reactionWhereUnique(target, userId),
      create: { ...target, userId, type },
      update: { type },
    });

    return type;
  }
}
