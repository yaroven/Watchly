import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ReactionArc } from "../enums/reaction-arc.enum";

export type SubjectClient = Pick<PrismaService, "title" | "comment">;

const COUNTERS_SELECT = {
  counters: { select: { likes: true, dislikes: true, commentCount: true } },
} as const;

export interface SubjectWithCounters {
  counters: { likes: number; dislikes: number; commentCount: number } | null;
}

type ArcForeignKey = Extract<Prisma.ReactionScalarFieldEnum, "titleId" | "commentId">;

interface ArcSpec {
  key: ArcForeignKey;
  segment: string;
  label: string;
  whereUnique: (subjectId: string, userId: string) => Prisma.ReactionWhereUniqueInput;
  exists: (client: SubjectClient, subjectId: string) => Promise<{ id: string } | null>;
  withCounters: (client: SubjectClient, subjectId: string) => Promise<SubjectWithCounters | null>;
  idsAfter: (
    client: SubjectClient,
    after: string | undefined,
    take: number,
  ) => Promise<{ id: string }[]>;
}

const ARCS = {
  [ReactionArc.TITLE]: {
    key: "titleId",
    segment: "titles",
    label: "Title",
    whereUnique: (titleId: string, userId: string) => ({ titleId_userId: { titleId, userId } }),
    exists: (client: SubjectClient, id: string) =>
      client.title.findUnique({ where: { id }, select: { id: true } }),
    withCounters: (client: SubjectClient, id: string) =>
      client.title.findUnique({ where: { id }, select: COUNTERS_SELECT }),
    idsAfter: (client: SubjectClient, after: string | undefined, take: number) =>
      client.title.findMany({
        where: after ? { id: { gt: after } } : undefined,
        orderBy: { id: "asc" },
        take,
        select: { id: true },
      }),
  },
  [ReactionArc.COMMENT]: {
    key: "commentId",
    segment: "comments",
    label: "Comment",
    whereUnique: (commentId: string, userId: string) => ({
      commentId_userId: { commentId, userId },
    }),
    exists: (client: SubjectClient, id: string) =>
      client.comment.findUnique({ where: { id }, select: { id: true } }),
    withCounters: (client: SubjectClient, id: string) =>
      client.comment.findUnique({ where: { id }, select: COUNTERS_SELECT }),
    idsAfter: (client: SubjectClient, after: string | undefined, take: number) =>
      client.comment.findMany({
        where: after ? { id: { gt: after } } : undefined,
        orderBy: { id: "asc" },
        take,
        select: { id: true },
      }),
  },
} as const satisfies Record<ReactionArc, ArcSpec>;

export type ReactionTarget = {
  [A in ReactionArc]: Record<(typeof ARCS)[A]["key"], string>;
}[ReactionArc];

export const REACTION_ARCS: ReactionArc[] = Object.values(ReactionArc);

export const REACTABLE_SEGMENTS: string[] = REACTION_ARCS.map((arc) => ARCS[arc].segment);

export const arcKey = (arc: ReactionArc): ArcForeignKey => ARCS[arc].key;

export const arcLabel = (arc: ReactionArc): string => ARCS[arc].label;

export const arcOfSegment = (segment: string): ReactionArc | undefined =>
  REACTION_ARCS.find((arc) => ARCS[arc].segment === segment);

export const arcOf = (target: ReactionTarget): ReactionArc => {
  const arc = REACTION_ARCS.find((candidate) => arcKey(candidate) in target);

  if (!arc) throw new Error(`A reaction target names no arc: ${JSON.stringify(target)}`);

  return arc;
};

export const targetOf = (arc: ReactionArc, subjectId: string): ReactionTarget =>
  ({ [arcKey(arc)]: subjectId }) as ReactionTarget;

export const subjectIdOf = (target: ReactionTarget): string =>
  (target as Record<ArcForeignKey, string>)[arcKey(arcOf(target))];

export const titleTarget = (titleId: string): ReactionTarget =>
  targetOf(ReactionArc.TITLE, titleId);

export const commentTarget = (commentId: string): ReactionTarget =>
  targetOf(ReactionArc.COMMENT, commentId);

export const reactionWhereUnique = (
  target: ReactionTarget,
  userId: string,
): Prisma.ReactionWhereUniqueInput => ARCS[arcOf(target)].whereUnique(subjectIdOf(target), userId);

export const subjectExists = (
  client: SubjectClient,
  target: ReactionTarget,
): Promise<{ id: string } | null> => ARCS[arcOf(target)].exists(client, subjectIdOf(target));

export const subjectWithCounters = (
  client: SubjectClient,
  target: ReactionTarget,
): Promise<SubjectWithCounters | null> =>
  ARCS[arcOf(target)].withCounters(client, subjectIdOf(target));

export const subjectNotFound = (target: ReactionTarget): NotFoundException =>
  new NotFoundException(`${arcLabel(arcOf(target))} with id ${subjectIdOf(target)} not found`);

export const subjectIdsAfter = async (
  client: SubjectClient,
  arc: ReactionArc,
  after: string | undefined,
  take: number,
): Promise<string[]> => (await ARCS[arc].idsAfter(client, after, take)).map(({ id }) => id);
