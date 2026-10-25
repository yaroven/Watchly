import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionService } from "./reaction.service";
import { commentTarget, titleTarget } from "./utils/reaction-target.const";

const { LIKE, DISLIKE } = ReactionType;

/** A Prisma client's delegates. Never shared with a transaction's — see CLAUDE.md. */
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
   * The row and the counter that summarises it have to land together: before
   * the split that introduced a client parameter, a failed recount left the
   * counter wrong with nothing to retry.
   */
  describe("transactionality", () => {
    it("writes the row and the counter on one transaction client", async () => {
      await service.setVote(titleTarget(titleId), userId, LIKE);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.reaction.upsert).toHaveBeenCalled();
      expect(tx.reaction.groupBy).toHaveBeenCalled();
      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
      expect(prisma.reaction.groupBy).not.toHaveBeenCalled();
    });
  });

  describe("setVote", () => {
    it("writes the vote it was given", async () => {
      await service.setVote(titleTarget(titleId), userId, DISLIKE);

      expect(tx.reaction.upsert).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type: DISLIKE },
        update: { type: DISLIKE },
      });
    });

    /** Absolute: the same vote twice is the same write twice, never an undo. */
    it("writes the same vote again rather than withdrawing it", async () => {
      await service.setVote(titleTarget(titleId), userId, LIKE);
      await service.setVote(titleTarget(titleId), userId, LIKE);

      expect(tx.reaction.deleteMany).not.toHaveBeenCalled();
      expect(tx.reaction.upsert).toHaveBeenCalledTimes(2);
    });

    it("answers with exact counts, recounted by this call", async () => {
      tx.engagementCounters.upsert.mockResolvedValue({ likes: 7, dislikes: 2, commentCount: 1 });

      await expect(service.setVote(titleTarget(titleId), userId, LIKE)).resolves.toEqual({
        likes: 7,
        dislikes: 2,
        commentCount: 1,
        myReaction: LIKE,
      });
    });
  });

  describe("clearVote", () => {
    it("removes the row", async () => {
      await service.clearVote(commentTarget(commentId), userId);

      expect(tx.reaction.deleteMany).toHaveBeenCalledWith({ where: { commentId, userId } });
      expect(tx.reaction.upsert).not.toHaveBeenCalled();
    });

    it("is not an error when there was nothing to withdraw", async () => {
      tx.reaction.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.clearVote(titleTarget(titleId), userId)).resolves.toMatchObject({
        myReaction: null,
      });
    });
  });

  describe("applyAbsolute", () => {
    it("recomputes the counters on the client it was given", async () => {
      await service.applyAbsolute(tx as never, commentTarget(commentId), userId, LIKE);

      expect(tx.reaction.groupBy).toHaveBeenCalledWith({
        by: ["type"],
        where: { commentId },
        _count: { _all: true },
      });
      expect(prisma.reaction.groupBy).not.toHaveBeenCalled();
    });

    /** Applying the same state twice has to land the same rows. */
    it("is idempotent", async () => {
      await service.applyAbsolute(tx as never, titleTarget(titleId), userId, LIKE);
      await service.applyAbsolute(tx as never, titleTarget(titleId), userId, LIKE);

      expect(tx.reaction.upsert).toHaveBeenNthCalledWith(2, {
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type: LIKE },
        update: { type: LIKE },
      });
    });

    it("hands back the counts it wrote", async () => {
      tx.engagementCounters.upsert.mockResolvedValue({ likes: 3, dislikes: 0, commentCount: 0 });

      await expect(
        service.applyAbsolute(tx as never, titleTarget(titleId), userId, LIKE),
      ).resolves.toEqual({ likes: 3, dislikes: 0, commentCount: 0 });
    });
  });

  describe("assertSubjectExists", () => {
    it("rejects a title that is gone", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(titleTarget(titleId))).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a comment that is gone", async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(commentTarget(commentId))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
