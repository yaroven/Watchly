import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionService } from "./reaction.service";
import { commentTarget, titleTarget } from "./utils/reaction-target.const";

/**
 * The delegates both clients need. Two separate instances, never one shared
 * object: mocking `$transaction` as `(fn) => fn(prisma)` makes the transaction
 * client and the base client the same thing, and then "it runs in a
 * transaction" asserts nothing at all.
 */
const client = () => ({
  reaction: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  engagementCounters: {
    upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
    findUnique: jest.fn().mockResolvedValue(null),
  },
  title: { findUnique: jest.fn() },
  comment: { findUnique: jest.fn(), count: jest.fn() },
});

describe("ReactionService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  let service: ReactionService;
  let prisma: ReturnType<typeof client> & { $transaction: jest.Mock };
  let tx: ReturnType<typeof client>;

  beforeEach(async () => {
    tx = client();
    prisma = {
      ...client(),
      $transaction: jest.fn((fn: (c: unknown) => unknown) => fn(tx)),
    };
    prisma.title.findUnique.mockResolvedValue({ id: titleId });
    prisma.comment.findUnique.mockResolvedValue({ id: commentId });

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionService,
        EngagementCountersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ReactionService);
  });

  afterEach(() => jest.clearAllMocks());

  /**
   * The reason the split exists. The vote row and the counter that summarises
   * it have to commit together; before this, `vote` defaulted its client to the
   * base one, so the only caller ran the toggle and the recount as two
   * autocommitted statements and a failed recount left the counter wrong with
   * nothing to retry.
   */
  describe("transactionality", () => {
    it("opens a transaction for a vote and writes the row on it", async () => {
      await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.reaction.upsert).toHaveBeenCalled();
      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
    });

    it("recounts on the same transaction the row was written on", async () => {
      await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(tx.reaction.groupBy).toHaveBeenCalled();
      expect(tx.engagementCounters.upsert).toHaveBeenCalled();
      expect(prisma.engagementCounters.upsert).not.toHaveBeenCalled();
    });

    it("opens one for a withdrawal too", async () => {
      await service.unvote(titleTarget(titleId), userId);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.reaction.deleteMany).toHaveBeenCalled();
      expect(prisma.reaction.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("vote", () => {
    it("casts the vote on the arc the target names", async () => {
      await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(tx.reaction.upsert).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type: ReactionType.LIKE },
        update: { type: ReactionType.LIKE },
      });
    });

    // The unique index is per arc, so a comment's vote must address the comment
    // one — naming the title index would write under the wrong constraint.
    it("uses the comment's own unique index for a comment", async () => {
      await service.vote(commentTarget(commentId), userId, ReactionType.DISLIKE);

      expect(tx.reaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { commentId_userId: { commentId, userId } } }),
      );
    });

    it("withdraws instead when the viewer sends the vote they already cast", async () => {
      tx.reaction.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(tx.reaction.upsert).not.toHaveBeenCalled();
      expect(result.myReaction).toBeNull();
    });

    /**
     * The point of folding the recount in: no feature service owns part of
     * casting a vote, so there is no path that writes the row and leaves the
     * cached counters behind it.
     */
    it("recomputes the subject's counters as part of the vote", async () => {
      tx.reaction.groupBy.mockResolvedValue([{ type: ReactionType.LIKE, _count: { _all: 3 } }]);
      tx.engagementCounters.upsert.mockResolvedValue({ likes: 3, dislikes: 0, commentCount: 1 });

      const result = await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(tx.reaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { titleId } }),
      );
      expect(result).toEqual({ likes: 3, dislikes: 0, commentCount: 1, myReaction: "LIKE" });
    });
  });

  describe("voteWithin", () => {
    // For a caller that already holds a transaction: it must not open another,
    // since Prisma cannot nest one.
    it("writes on the client it is handed without opening a transaction", async () => {
      const caller = client();

      await service.voteWithin(caller as never, titleTarget(titleId), userId, ReactionType.LIKE);

      expect(caller.reaction.upsert).toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.reaction.upsert).not.toHaveBeenCalled();
    });
  });

  describe("unvote", () => {
    it("drops the viewer's vote whatever it was, and recounts", async () => {
      await service.unvote(commentTarget(commentId), userId);

      expect(tx.reaction.deleteMany).toHaveBeenCalledWith({ where: { commentId, userId } });
      expect(tx.engagementCounters.upsert).toHaveBeenCalled();
    });

    it("reports no reaction afterwards", async () => {
      await expect(service.unvote(titleTarget(titleId), userId)).resolves.toMatchObject({
        myReaction: null,
      });
    });
  });

  describe("assertSubjectExists", () => {
    it("refuses a title that is gone", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(titleTarget(titleId))).rejects.toThrow(
        NotFoundException,
      );
    });

    it("refuses a comment that is gone", async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(commentTarget(commentId))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
