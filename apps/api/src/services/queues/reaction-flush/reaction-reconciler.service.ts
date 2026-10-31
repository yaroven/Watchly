import { Injectable, Logger } from "@nestjs/common";
import { Logged } from "../../../decorators/logged.decorator";
import {
  counterOf,
  EngagementCountersService,
  REACTION_COUNTERS,
  ReactionCounter,
  zeroCounters,
} from "../../engagement/engagement-counters.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ReactionArc } from "../../reaction/enums/reaction-arc.enum";
import {
  arcKey,
  REACTION_ARCS,
  subjectIdsAfter,
  targetOf,
} from "../../reaction/utils/reaction-target.const";
import { RedisService } from "../../redis/redis.service";
import { driftKey } from "./reaction-drift.const";

export const RECONCILE_BATCH_SIZE = 1000;

type Counts = Record<ReactionCounter, number>;

const differ = (a: Counts, b: Counts): boolean =>
  REACTION_COUNTERS.some((counter) => a[counter] !== b[counter]);

@Injectable()
export class ReactionReconciler {
  private readonly logger = new Logger(ReactionReconciler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
    private readonly redis: RedisService,
  ) {}

  @Logged()
  async reconcile(): Promise<void> {
    for (const arc of REACTION_ARCS) {
      await this.reconcileArc(arc);
    }
  }

  @Logged()
  private async reconcileArc(arc: ReactionArc): Promise<number> {
    let drifted = 0;
    let after: string | undefined;

    for (;;) {
      const subjectIds = await subjectIdsAfter(this.prisma, arc, after, RECONCILE_BATCH_SIZE);
      if (subjectIds.length === 0) break;

      drifted += await this.reconcileBatch(arc, subjectIds);

      if (subjectIds.length < RECONCILE_BATCH_SIZE) break;
      after = subjectIds[subjectIds.length - 1];
    }

    if (drifted > 0) {
      this.logger.warn(`Repaired ${drifted} ${arc} counter rows that had drifted`);
    }

    await this.publish(arc, drifted);
    return drifted;
  }

  @Logged()
  private async reconcileBatch(arc: ReactionArc, subjectIds: string[]): Promise<number> {
    const [expected, stored] = await Promise.all([
      this.expectedCounts(arc, subjectIds),
      this.storedCounts(arc, subjectIds),
    ]);

    const drifted = subjectIds.filter((subjectId) =>
      differ(expected.get(subjectId) ?? zeroCounters(), stored.get(subjectId) ?? zeroCounters()),
    );

    for (const subjectId of drifted) {
      await this.counters.recomputeReactions(targetOf(arc, subjectId), this.prisma);
    }

    return drifted.length;
  }

  @Logged()
  private async expectedCounts(
    arc: ReactionArc,
    subjectIds: string[],
  ): Promise<Map<string, Counts>> {
    const key = arcKey(arc);
    const grouped = await this.prisma.reaction.groupBy({
      by: [key, "type"],
      where: { [key]: { in: subjectIds } },
      _count: { _all: true },
    });

    const counts = new Map<string, Counts>();

    for (const row of grouped) {
      const subjectId = row[key];
      if (!subjectId) continue;

      const current = counts.get(subjectId) ?? zeroCounters();
      current[counterOf(row.type)] = row._count._all;
      counts.set(subjectId, current);
    }

    return counts;
  }

  @Logged()
  private async storedCounts(arc: ReactionArc, subjectIds: string[]): Promise<Map<string, Counts>> {
    const key = arcKey(arc);
    const rows = await this.prisma.engagementCounters.findMany({
      where: { [key]: { in: subjectIds } },
    });

    const counts = new Map<string, Counts>();

    for (const row of rows) {
      const subjectId = row[key];
      if (!subjectId) continue;

      const current = zeroCounters();

      for (const counter of REACTION_COUNTERS) {
        current[counter] = row[counter];
      }

      counts.set(subjectId, current);
    }

    return counts;
  }

  @Logged()
  private async publish(arc: ReactionArc, drifted: number): Promise<void> {
    try {
      await this.writeDrift(arc, drifted);
    } catch {
      // @Logged has already logged this failure
    }
  }

  @Logged({ failedLevel: "warn" })
  private async writeDrift(arc: ReactionArc, drifted: number): Promise<void> {
    await this.redis.set(driftKey(arc), drifted);
  }
}
