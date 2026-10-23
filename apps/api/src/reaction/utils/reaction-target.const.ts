import { Prisma } from "@prisma/client";

/**
 * Which arc the reaction hangs off. Exactly one, the way the CHECK constraint
 * says (ADR-0015) — a union rather than two optional fields, so "neither" and
 * "both" are not expressible in the first place.
 */
export type ReactionTarget = { titleId: string } | { commentId: string };

export const titleTarget = (titleId: string): ReactionTarget => ({ titleId });

export const commentTarget = (commentId: string): ReactionTarget => ({ commentId });

/** The arc as one word, for a cache key. Nothing else reads it. */
export const arcOf = (target: ReactionTarget): "title" | "comment" =>
  "titleId" in target ? "title" : "comment";

export const subjectIdOf = (target: ReactionTarget): string =>
  "titleId" in target ? target.titleId : target.commentId;

/**
 * The row a (subject, viewer) pair names. The unique index is per arc, so the
 * compound key differs between the two sides even though the question does not.
 */
export const reactionWhereUnique = (
  target: ReactionTarget,
  userId: string,
): Prisma.ReactionWhereUniqueInput =>
  "titleId" in target
    ? { titleId_userId: { titleId: target.titleId, userId } }
    : { commentId_userId: { commentId: target.commentId, userId } };
