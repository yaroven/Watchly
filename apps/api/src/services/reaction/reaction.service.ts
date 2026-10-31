import { Injectable } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { Logged } from "../../decorators/logged.decorator";
import {
  EngagementCountersService,
  EngagementCounts,
} from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionResult, Reactions } from "./reaction.types";
import {
  ReactionTarget,
  reactionWhereUnique,
  subjectExists,
  subjectNotFound,
} from "./utils/reaction-target.const";
import { Vote } from "./utils/vote.util";

type VoteClient = Pick<PrismaService, "reaction">;

type ReactionClient = Pick<PrismaService, "reaction" | "engagementCounters" | "comment">;

@Injectable()
export class ReactionService implements Reactions {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
  ) {}

  @Logged()
  async setVote(
    target: ReactionTarget,
    userId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.write(target, userId, type);
  }

  @Logged()
  async clearVote(target: ReactionTarget, userId: string): Promise<ReactionResult> {
    return this.write(target, userId, null);
  }

  @Logged()
  async writeVote(
    client: VoteClient,
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
  }

  @Logged()
  async applyAbsolute(
    client: ReactionClient,
    target: ReactionTarget,
    userId: string,
    vote: Vote,
  ): Promise<EngagementCounts> {
    await this.writeVote(client, target, userId, vote);

    return this.counters.recomputeReactions(target, client);
  }

  @Logged()
  private async write(target: ReactionTarget, userId: string, vote: Vote): Promise<ReactionResult> {
    if (!(await subjectExists(this.prisma, target))) throw subjectNotFound(target);

    const counts = await this.prisma.$transaction((tx) =>
      this.applyAbsolute(tx, target, userId, vote),
    );

    return { ...counts, myReaction: vote };
  }
}
