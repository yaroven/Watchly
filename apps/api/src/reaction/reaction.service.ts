import { Injectable, NotFoundException } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import {
  EngagementCountersService,
  EngagementCounts,
} from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionResult, Reactions } from "./reaction.types";
import {
  arcLabel,
  arcOf,
  ReactionTarget,
  reactionWhereUnique,
  subjectExists,
  subjectIdOf,
} from "./utils/reaction-target.const";
import { Vote } from "./utils/vote.util";

type ReactionClient = Pick<PrismaService, "reaction" | "engagementCounters" | "comment">;

@Injectable()
export class ReactionService implements Reactions {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
  ) {}

  async assertSubjectExists(target: ReactionTarget): Promise<void> {
    if (await subjectExists(this.prisma, target)) return;

    throw new NotFoundException(
      `${arcLabel(arcOf(target))} with id ${subjectIdOf(target)} not found`,
    );
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

    return this.counters.recomputeReactions(target, client);
  }

  private async write(target: ReactionTarget, userId: string, vote: Vote): Promise<ReactionResult> {
    const counts = await this.prisma.$transaction((tx) =>
      this.applyAbsolute(tx, target, userId, vote),
    );

    return { ...counts, myReaction: vote };
  }
}
