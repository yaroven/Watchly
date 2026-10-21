import { Prisma } from "@prisma/client";
import { CountersSubject } from "../../engagement/engagement-counters.service";

/**
 * What a comment hangs off: a title, or the comment it answers. Exactly one,
 * the way the CHECK constraint says — a union rather than two optional fields,
 * so neither "both" nor "neither" is expressible.
 */
export type CommentSubject = { titleId: string } | { parentId: string };

export const titleSubject = (titleId: string): CommentSubject => ({ titleId });

export const replySubject = (commentId: string): CommentSubject => ({ parentId: commentId });

/** The comment rows that hang off this subject. */
export const subjectWhere = (subject: CommentSubject): Prisma.CommentWhereInput => subject;

/**
 * The counters row for the same subject. A title's counters hang off the title;
 * a reply's hang off the comment it answers, which is the same arc read from
 * the other end.
 */
export const countersSubjectOf = (subject: CommentSubject): CountersSubject =>
  "titleId" in subject ? { titleId: subject.titleId } : { commentId: subject.parentId };
