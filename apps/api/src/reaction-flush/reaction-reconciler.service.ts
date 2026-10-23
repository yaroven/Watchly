import { Injectable, Logger } from "@nestjs/common";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionArc, targetOf } from "../reaction/utils/reaction-target.const";
import { RedisService } from "../redis/redis.service";
import { driftKey } from "./reaction-drift.const";

interface Counts {
  likes: number;
  dislikes: number;
}

const ARCS: ReactionArc[] = ["title", "comment"];

const ZERO: Counts = { likes: 0, dislikes: 0 };

const differ = (a: Counts, b: Counts): boolean => a.likes !== b.likes || a.dislikes !== b.dislikes;

/**
 * Checks, nightly, that `EngagementCounters` still says what the `Reaction`
 * rows say — and fixes it where it doesn't.
 *
 * The design it backs up assumes drift is rare and self-healing, and nothing
 * else would ever tell us whether that is true. So this both repairs and
 * **reports**: the number of subjects it had to fix goes to a gauge, because a
 * reconciler that quietly fixes a growing pile is indistinguishable from one
 * that has nothing to do.
 *
 * A full sweep rather than a list of dirty subjects. Tracking dirt would mean
 * keeping that list in the same Redis whose disagreements this exists to catch,
 * and at this size the sweep is two aggregate queries per arc — the repairs
 * after it are the only per-subject work, and there should be none.
 *
 * It runs in the worker because that process has one replica. The same cron in
 * the api would run twice over, once per replica, the way
 * `ExternalRatingsService` already does. The `@Cron` itself is one class over,
 * in `ReactionReconcileSchedule`, so that this file can be unit-tested at all:
 * `@nestjs/schedule` is ESM and jest cannot parse it, which is why nothing with
 * a `@Cron` in it has ever had a spec here.
 */
@Injectable()
export class ReactionReconciler {
  private readonly logger = new Logger(ReactionReconciler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: EngagementCountersService,
    private readonly redis: RedisService,
  ) {}

  async reconcile(): Promise<void> {
    for (const arc of ARCS) {
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

  /** What the rows say, two values per subject, in one aggregate. */
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

  /** What the cache of those rows says. */
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

  /**
   * Left in Redis for the api to pick up, the same way queue depth is: this
   * process serves no `/metrics`, so a counter incremented here would have no
   * reader at all.
   */
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
