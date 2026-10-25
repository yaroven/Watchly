import { Injectable, Logger } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionArc } from "../reaction/enums/reaction-arc.enum";
import { arcKey, REACTION_ARCS, targetOf } from "../reaction/utils/reaction-target.const";
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
    const key = arcKey(arc);
    const grouped = await this.prisma.reaction.groupBy({
      by: [key, "type"],
      where: { [key]: { not: null } },
      _count: { _all: true },
    });

    const counts = new Map<string, Counts>();

    for (const row of grouped) {
      const subjectId = row[key];
      if (!subjectId) continue;

      const current = counts.get(subjectId) ?? { ...ZERO };
      if (row.type === ReactionType.LIKE) current.likes = row._count._all;
      else current.dislikes = row._count._all;
      counts.set(subjectId, current);
    }

    return counts;
  }

  private async storedCounts(arc: ReactionArc): Promise<Map<string, Counts>> {
    const key = arcKey(arc);
    const rows = await this.prisma.engagementCounters.findMany({
      where: { [key]: { not: null } },
    });

    const counts = new Map<string, Counts>();

    for (const row of rows) {
      const subjectId = row[key];
      if (!subjectId) continue;

      counts.set(subjectId, { likes: row.likes, dislikes: row.dislikes });
    }

    return counts;
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
