import { Injectable } from "@nestjs/common";
import { Prisma, ReactionType } from "@prisma/client";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";

export type CountersClient = Pick<PrismaService, "engagementCounters" | "reaction" | "comment">;

/**
 * Which arc the row hangs off. Exactly one, the way the CHECK constraint says —
 * a union rather than two optional fields, so "neither" and "both" are not
 * expressible in the first place.
 */
export type CountersSubject = { titleId: string } | { commentId: string };

export interface EngagementCounts {
  likes: number;
  dislikes: number;
  commentCount: number;
}

export const NO_COUNTS: EngagementCounts = { likes: 0, dislikes: 0, commentCount: 0 };

export type ReactionCounter = Exclude<keyof EngagementCounts, "commentCount">;

export const counterOf = (type: ReactionType): ReactionCounter => {
  switch (type) {
    case ReactionType.LIKE:
      return "likes";
    case ReactionType.DISLIKE:
      return "dislikes";
    default: {
      const unhandled: never = type;
      throw new Error(`No counter holds ${String(unhandled)}`);
    }
  }
};

export const REACTION_COUNTERS: ReactionCounter[] = Object.values(ReactionType).map(counterOf);

export const zeroCounters = (): Record<ReactionCounter, number> =>
  Object.fromEntries(REACTION_COUNTERS.map((counter) => [counter, 0])) as Record<
    ReactionCounter,
    number
  >;

export const titleCounters = (titleId: string): CountersSubject => ({ titleId });

export const commentCounters = (commentId: string): CountersSubject => ({ commentId });

/** A row, or the zeroes that mean "nothing counted yet". */
export const countsOf = (row: EngagementCounts | null | undefined): EngagementCounts =>
  row ? { likes: row.likes, dislikes: row.dislikes, commentCount: row.commentCount } : NO_COUNTS;

@Injectable()
export class EngagementCountersService {
  constructor(private readonly prisma: PrismaService) {}

  @Logged()
  async recomputeReactions(
    subject: CountersSubject,
    client: CountersClient,
  ): Promise<EngagementCounts> {
    const grouped = await client.reaction.groupBy({
      by: ["type"],
      where: subject,
      _count: { _all: true },
    });

    const counts = zeroCounters();

    for (const row of grouped) {
      counts[counterOf(row.type)] = row._count._all;
    }

    return this.write(subject, counts, client);
  }

  @Logged()
  async recomputeComments(
    subject: CountersSubject,
    client: CountersClient,
  ): Promise<EngagementCounts> {
    const where: Prisma.CommentWhereInput =
      "titleId" in subject ? { titleId: subject.titleId } : { parentId: subject.commentId };

    const commentCount = await client.comment.count({ where });

    return this.write(subject, { commentCount }, client);
  }

  @Logged()
  async countsForOne(subject: CountersSubject, client: CountersClient): Promise<EngagementCounts> {
    const row = await client.engagementCounters.findUnique({ where: subject });
    return countsOf(row);
  }

  @Logged()
  private async write(
    subject: CountersSubject,
    counts: Partial<EngagementCounts>,
    client: CountersClient,
  ): Promise<EngagementCounts> {
    const row = await client.engagementCounters.upsert({
      where: subject,
      create: { ...subject, ...counts },
      update: counts,
    });

    return countsOf(row);
  }
}
