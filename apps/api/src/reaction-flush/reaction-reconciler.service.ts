import { Injectable, Logger } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { REACTION_ARCS, ReactionArc, targetOf } from "../reaction/utils/reaction-target.const";
import { RedisService } from "../redis/redis.service";
import { driftKey } from "./reaction-drift.const";

interface Counts {
  likes: number;
  dislikes: number;
}

const ZERO: Counts = { likes: 0, dislikes: 0 };

const differ = (a: Counts, b: Counts): boolean => a.likes !== b.likes || a.dislikes !== b.dislikes;

@Injectable()
export class ReactionReconciler {
  private readonly logger = new Logger(ReactionReconciler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
    private readonly redis: RedisService,
  ) {}

  async reconcile(): Promise<void> {
    for (const arc of REACTION_ARCS) {
      await this.reconcileArc(arc);
    }
  }

  private async reconcileArc(arc: ReactionArc): Promise<void> {
    const [expected, stored] = await Promise.all([
      this.expectedCounts(arc),
      this.storedCounts(arc),
    ]);

    const subjectIds = new Set([...expected.keys(), ...stored.keys()]);
    const drifted = [...subjectIds].filter((subjectId) =>
      differ(expected.get(subjectId) ?? ZERO, stored.get(subjectId) ?? ZERO),
    );

    for (const subjectId of drifted) {
      await this.counters.recomputeReactions(targetOf(arc, subjectId), this.prisma);
    }

    if (drifted.length > 0) {
      this.logger.warn(`Repaired ${drifted.length} ${arc} counter rows that had drifted`);
    }

    await this.publish(arc, drifted.length);
  }

  private async expectedCounts(arc: ReactionArc): Promise<Map<string, Counts>> {
    const rows =
      arc === "title"
        ? (
            await this.prisma.reaction.groupBy({
              by: ["titleId", "type"],
              where: { titleId: { not: null } },
              _count: { _all: true },
            })
          ).map((row) => ({ subjectId: row.titleId!, type: row.type, count: row._count._all }))
        : (
            await this.prisma.reaction.groupBy({
              by: ["commentId", "type"],
              where: { commentId: { not: null } },
              _count: { _all: true },
            })
          ).map((row) => ({ subjectId: row.commentId!, type: row.type, count: row._count._all }));

    const counts = new Map<string, Counts>();

    for (const { subjectId, type, count } of rows) {
      const current = counts.get(subjectId) ?? { ...ZERO };
      if (type === ReactionType.LIKE) current.likes = count;
      else current.dislikes = count;
      counts.set(subjectId, current);
    }

    return counts;
  }

  private async storedCounts(arc: ReactionArc): Promise<Map<string, Counts>> {
    const rows =
      arc === "title"
        ? (
            await this.prisma.engagementCounters.findMany({
              where: { titleId: { not: null } },
              select: { titleId: true, likes: true, dislikes: true },
            })
          ).map((row) => ({ subjectId: row.titleId!, likes: row.likes, dislikes: row.dislikes }))
        : (
            await this.prisma.engagementCounters.findMany({
              where: { commentId: { not: null } },
              select: { commentId: true, likes: true, dislikes: true },
            })
          ).map((row) => ({ subjectId: row.commentId!, likes: row.likes, dislikes: row.dislikes }));

    return new Map(rows.map(({ subjectId, likes, dislikes }) => [subjectId, { likes, dislikes }]));
  }

  private async publish(arc: ReactionArc, drifted: number): Promise<void> {
    try {
      await this.redis.set(driftKey(arc), drifted);
    } catch (error) {
      this.logger.warn(
        `Could not publish the ${arc} drift count: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
