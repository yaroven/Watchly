import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { commentTarget, ReactionService, titleTarget } from "./reaction.service";

describe("ReactionService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  let service: ReactionService;
  let prisma: {
    reaction: { deleteMany: jest.Mock; upsert: jest.Mock; groupBy: jest.Mock };
    engagementCounters: { upsert: jest.Mock; findUnique: jest.Mock };
    title: { findUnique: jest.Mock };
    comment: { findUnique: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      reaction: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      engagementCounters: {
        upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      title: { findUnique: jest.fn().mockResolvedValue({ id: titleId }) },
      comment: { findUnique: jest.fn().mockResolvedValue({ id: commentId }), count: jest.fn() },
    };

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

  describe("vote", () => {
    it("casts the vote on the arc the target names", async () => {
      await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(prisma.reaction.upsert).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type: ReactionType.LIKE },
        update: { type: ReactionType.LIKE },
      });
    });

    // The unique index is per arc, so a comment's vote must address the comment
    // one — naming the title index would write under the wrong constraint.
    it("uses the comment's own unique index for a comment", async () => {
      await service.vote(commentTarget(commentId), userId, ReactionType.DISLIKE);

      expect(prisma.reaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { commentId_userId: { commentId, userId } } }),
      );
    });

    it("withdraws instead when the viewer sends the vote they already cast", async () => {
      prisma.reaction.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
      expect(result.myReaction).toBeNull();
    });

    /**
     * The point of folding the recount in: no feature service owns part of
     * casting a vote, so there is no path that writes the row and leaves the
     * cached counters behind it.
     */
    it("recomputes the subject's counters as part of the vote", async () => {
      prisma.reaction.groupBy.mockResolvedValue([{ type: ReactionType.LIKE, _count: { _all: 3 } }]);
      prisma.engagementCounters.upsert.mockResolvedValue({
        likes: 3,
        dislikes: 0,
        commentCount: 1,
      });

      const result = await service.vote(titleTarget(titleId), userId, ReactionType.LIKE);

      expect(prisma.reaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { titleId } }),
      );
      expect(result).toEqual({ likes: 3, dislikes: 0, commentCount: 1, myReaction: "LIKE" });
    });

    it("writes on the client it is handed, so a caller's transaction holds", async () => {
      const tx = {
        reaction: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn(),
          groupBy: jest.fn().mockResolvedValue([]),
        },
        engagementCounters: {
          upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
          findUnique: jest.fn(),
        },
        comment: { count: jest.fn() },
      };

      await service.vote(titleTarget(titleId), userId, ReactionType.LIKE, tx as never);

      expect(tx.reaction.upsert).toHaveBeenCalled();
      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
    });
  });

  describe("unvote", () => {
    it("drops the viewer's vote whatever it was, and recounts", async () => {
      await service.unvote(commentTarget(commentId), userId);

      expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({ where: { commentId, userId } });
      expect(prisma.engagementCounters.upsert).toHaveBeenCalled();
    });

    it("reports no reaction afterwards", async () => {
      await expect(service.unvote(titleTarget(titleId), userId)).resolves.toMatchObject({
        myReaction: null,
      });
    });
  });

  describe("assertSubjectExists", () => {
    it.each([
      ["title", () => titleTarget(titleId), "title"],
      ["comment", () => commentTarget(commentId), "comment"],
    ])("looks the %s up in its own table", async (_case, target, delegate) => {
      await service.assertSubjectExists(target());

      expect(prisma[delegate as "title" | "comment"].findUnique).toHaveBeenCalledWith({
        where: { id: delegate === "title" ? titleId : commentId },
        select: { id: true },
      });
    });

    /**
     * The foreign key would reject the insert anyway, but as a Prisma error
     * after the request was accepted. This turns it into the 404 it is.
     */
    it("refuses a subject that is not there", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(titleTarget(titleId))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
