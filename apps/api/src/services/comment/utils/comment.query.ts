import { Prisma } from "@prisma/client";
import { CommentSortMode } from "./comment-sort.const";
import { CommentSubject } from "./comment-subject.const";

/** How many replies a root comment ships with the page. */
export const REPLY_PREVIEW_SIZE = 3;

export const AUTHOR_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarKey: true,
} as const;

/**
 * The Prisma and SQL shapes a comment read is made of.
 *
 * The two raw queries are here rather than inline because neither has a Prisma
 * API: one is a top-N-per-group, the other sorts by a column on a related
 * table. Keeping them beside the include makes the whole read visible in one
 * file — the same reason `title/utils/title.query.ts` exists.
 */
const commentQuery = {
  /**
   * The author, the cached counters, and the viewer's own vote. The last is
   * omitted for an anonymous read rather than filtered by `undefined`, which
   * Prisma reads as "no filter" and would hand back somebody else's vote.
   */
  withViewer: (viewerId?: string, titleId?: string) =>
    ({
      user: {
        select: {
          ...AUTHOR_SELECT,
          // The author's own score for the thread's title, shown next to what
          // they wrote. A relation rather than a lookup of our own: Prisma
          // batches it for the page, which is the query we used to write by
          // hand. Omitted for a thread that hangs off anything but a title,
          // because only titles have scores.
          ...(titleId ? { ratings: { where: { titleId }, select: { score: true } } } : {}),
        },
      },
      counters: true,
      ...(viewerId ? { reactions: { where: { userId: viewerId }, select: { type: true } } } : {}),
    }) satisfies Prisma.CommentInclude,

  rootOrder: (sort: CommentSortMode) =>
    ({
      createdAt: sort === "oldest" ? "asc" : "desc",
    }) satisfies Prisma.CommentOrderByWithRelationInput,

  /**
   * The first few replies of each root in one query.
   *
   * `ROW_NUMBER() OVER (PARTITION BY ...)` is a top-N-per-group, which Prisma
   * cannot express — the alternative is a query per root comment.
   */
  replyPreviewIds: (rootIds: string[], perRoot: number = REPLY_PREVIEW_SIZE): Prisma.Sql =>
    Prisma.sql`
      SELECT id FROM (
        SELECT c."id", ROW_NUMBER() OVER (PARTITION BY c."parentId" ORDER BY c."createdAt" ASC) AS rn
        FROM "Comment" c
        WHERE c."parentId" IN (${Prisma.join(rootIds)})
      ) ranked
      WHERE ranked.rn <= ${perRoot}
    `,

  /**
   * Root ids ranked by likes.
   *
   * Raw because the ranking column lives on `EngagementCounters`, and Prisma
   * cannot order by a relation's field. The arc is a fragment so the two kinds
   * of subject share the one query instead of having a copy each.
   */
  hottestRootIds: (subject: CommentSubject, limit: number, skip: number): Prisma.Sql => {
    const arc =
      "titleId" in subject
        ? Prisma.sql`c."titleId" = ${subject.titleId}`
        : Prisma.sql`c."parentId" = ${subject.parentId}`;

    return Prisma.sql`
      SELECT c."id"
      FROM "Comment" c
      LEFT JOIN "EngagementCounters" e ON e."commentId" = c."id"
      WHERE ${arc}
      ORDER BY COALESCE(e."likes", 0) DESC, c."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
  },
};

export default commentQuery;
