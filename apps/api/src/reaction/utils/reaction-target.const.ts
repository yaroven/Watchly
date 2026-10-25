import { Prisma } from "@prisma/client";

export type ReactionTarget = { titleId: string } | { commentId: string };

export const titleTarget = (titleId: string): ReactionTarget => ({ titleId });

export const commentTarget = (commentId: string): ReactionTarget => ({ commentId });

export type ReactionArc = "title" | "comment";

export const REACTION_ARCS: ReactionArc[] = ["title", "comment"];

export const arcOf = (target: ReactionTarget): ReactionArc =>
  "titleId" in target ? "title" : "comment";

export const targetOf = (arc: ReactionArc, subjectId: string): ReactionTarget =>
  arc === "title" ? titleTarget(subjectId) : commentTarget(subjectId);

export const subjectIdOf = (target: ReactionTarget): string =>
  "titleId" in target ? target.titleId : target.commentId;

export const reactionWhereUnique = (
  target: ReactionTarget,
  userId: string,
): Prisma.ReactionWhereUniqueInput =>
  "titleId" in target
    ? { titleId_userId: { titleId: target.titleId, userId } }
    : { commentId_userId: { commentId: target.commentId, userId } };
