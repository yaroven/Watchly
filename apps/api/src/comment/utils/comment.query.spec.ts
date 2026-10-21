import { replySubject, titleSubject } from "./comment-subject.const";
import commentQuery, { REPLY_PREVIEW_SIZE } from "./comment.query";

describe("commentQuery", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";

  describe("withViewer", () => {
    it("loads the counters and the author either way", () => {
      const include = commentQuery.withViewer();

      expect(include.counters).toBe(true);
      expect(include.user).toEqual({ select: expect.objectContaining({ avatarKey: true }) });
    });

    /**
     * Prisma reads `undefined` in a `where` as "no filter", so a relation left
     * in place for an anonymous read would hand back every viewer's votes.
     */
    it("omits the viewer's reaction entirely when there is no viewer", () => {
      expect(commentQuery.withViewer()).not.toHaveProperty("reactions");
      expect(commentQuery.withViewer("viewer-1")).toHaveProperty("reactions", {
        where: { userId: "viewer-1" },
        select: { type: true },
      });
    });
  });

  describe("replyPreviewIds", () => {
    it("ranks replies per root so one query serves the whole page", () => {
      const query = commentQuery.replyPreviewIds([commentId]);

      expect(query.sql).toContain('ROW_NUMBER() OVER (PARTITION BY c."parentId"');
      expect(query.values).toEqual([commentId, REPLY_PREVIEW_SIZE]);
    });

    it("takes the cap as a parameter rather than baking it in", () => {
      expect(commentQuery.replyPreviewIds([commentId], 5).values).toContain(5);
    });
  });

  describe("hottestRootIds", () => {
    // One query for both kinds of subject: the arc is a fragment, so the join
    // and the ordering cannot drift between a title's thread and a reply's.
    it("ranks on the cached like counter for either subject", () => {
      const forTitle = commentQuery.hottestRootIds(titleSubject(titleId), 10, 0);
      const forReply = commentQuery.hottestRootIds(replySubject(commentId), 10, 0);

      for (const query of [forTitle, forReply]) {
        expect(query.sql).toContain('LEFT JOIN "EngagementCounters" e ON e."commentId" = c."id"');
        expect(query.sql).toContain('ORDER BY COALESCE(e."likes", 0) DESC');
      }
    });

    it.each([
      ["a title", () => titleSubject(titleId), 'c."titleId" =', titleId],
      ["a reply", () => replySubject(commentId), 'c."parentId" =', commentId],
    ])("filters %s on its own column", (_case, subject, column, id) => {
      const query = commentQuery.hottestRootIds(subject(), 10, 20);

      expect(query.sql).toContain(column);
      expect(query.values).toEqual([id, 10, 20]);
    });
  });
});
