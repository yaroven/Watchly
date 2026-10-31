import { Prisma } from "@prisma/client";
import { CountersSubject } from "../../engagement/engagement-counters.service";

export type CommentSubject = { titleId: string } | { parentId: string };

export const titleSubject = (titleId: string): CommentSubject => ({ titleId });

export const replySubject = (commentId: string): CommentSubject => ({ parentId: commentId });

export const subjectOfRow = (row: {
  titleId: string | null;
  parentId: string | null;
}): CommentSubject => (row.titleId ? { titleId: row.titleId } : { parentId: row.parentId! });

export const subjectWhere = (subject: CommentSubject): Prisma.CommentWhereInput => subject;

export const countersSubjectOf = (subject: CommentSubject): CountersSubject =>
  "titleId" in subject ? { titleId: subject.titleId } : { commentId: subject.parentId };
