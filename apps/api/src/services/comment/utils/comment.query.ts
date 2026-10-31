import { Prisma } from "@prisma/client";
import { CommentSortMode } from "./comment-sort.const";
import { CommentSubject } from "./comment-subject.const";

export const REPLY_PREVIEW_SIZE = 3;

export const AUTHOR_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarKey: true,
} as const;

const commentQuery = {
  withViewer: (viewerId?: string, titleId?: string) =>
    ({
      user: {
        select: {
          ...AUTHOR_SELECT,
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

  replyPreviewIds: (rootIds: string[], perRoot: number = REPLY_PREVIEW_SIZE): Prisma.Sql =>
    Prisma.sql`
      SELECT id FROM (
        SELECT c."id", ROW_NUMBER() OVER (PARTITION BY c."parentId" ORDER BY c."createdAt" ASC) AS rn
        FROM "Comment" c
        WHERE c."parentId" IN (${Prisma.join(rootIds)})
      ) ranked
      WHERE ranked.rn <= ${perRoot}
    `,

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
