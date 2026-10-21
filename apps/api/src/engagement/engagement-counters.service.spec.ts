import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  commentCounters,
  EngagementCountersService,
  titleCounters,
} from "./engagement-counters.service";

describe("EngagementCountersService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";

  let service: EngagementCountersService;
  let prisma: {
    engagementCounters: { findUnique: jest.Mock; upsert: jest.Mock };
    reaction: { groupBy: jest.Mock };
    comment: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      engagementCounters: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
      },
      reaction: { groupBy: jest.fn().mockResolvedValue([]) },
      comment: { count: jest.fn().mockResolvedValue(0) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [EngagementCountersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(EngagementCountersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("recomputeReactions", () => {
    it("counts the reaction rows on the subject's arc and writes them", async () => {
      prisma.reaction.groupBy.mockResolvedValue([
        { type: ReactionType.LIKE, _count: { _all: 4 } },
        { type: ReactionType.DISLIKE, _count: { _all: 1 } },
      ]);

      await service.recomputeReactions(titleCounters(titleId));

      expect(prisma.reaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { titleId } }),
      );
      expect(prisma.engagementCounters.upsert).toHaveBeenCalledWith({
        where: { titleId },
        create: { titleId, likes: 4, dislikes: 1 },
        update: { likes: 4, dislikes: 1 },
      });
    });

    // Otherwise withdrawing the last like would leave the old number standing.
    it("writes a zero for a type with no rows left", async () => {
      prisma.reaction.groupBy.mockResolvedValue([
        { type: ReactionType.DISLIKE, _count: { _all: 2 } },
      ]);

      await service.recomputeReactions(commentCounters(commentId));

      expect(prisma.engagementCounters.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { likes: 0, dislikes: 2 } }),
      );
    });
  });

  describe("recomputeComments", () => {
    it("counts a title's own comments", async () => {
      prisma.comment.count.mockResolvedValue(9);

      await service.recomputeComments(titleCounters(titleId));

      expect(prisma.comment.count).toHaveBeenCalledWith({ where: { titleId } });
      expect(prisma.engagementCounters.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { commentCount: 9 } }),
      );
    });

    /**
     * A comment's replies are the comments whose parent it is — the same arc
     * read from the other end, which is why a reply count and a comment count
     * are one column.
     */
    it("counts a comment's replies through the parent arc", async () => {
      await service.recomputeComments(commentCounters(commentId));

      expect(prisma.comment.count).toHaveBeenCalledWith({ where: { parentId: commentId } });
      expect(prisma.engagementCounters.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { commentId } }),
      );
    });

    it("touches only its own column, leaving the reaction counts standing", async () => {
      await service.recomputeComments(titleCounters(titleId));

      const [[call]] = prisma.engagementCounters.upsert.mock.calls as [
        [{ update: Record<string, unknown> }],
      ];
      expect(Object.keys(call.update)).toEqual(["commentCount"]);
    });
  });

  describe("countsForOne", () => {
    it("reads the row for the subject's arc", async () => {
      prisma.engagementCounters.findUnique.mockResolvedValue({
        likes: 2,
        dislikes: 1,
        commentCount: 5,
      });

      await expect(service.countsForOne(titleCounters(titleId))).resolves.toEqual({
        likes: 2,
        dislikes: 1,
        commentCount: 5,
      });
    });

    // A row is written the first time something is counted, so a missing row
    // and an all-zero row are the same answer.
    it("answers zeroes for a subject with no row yet", async () => {
      await expect(service.countsForOne(commentCounters(commentId))).resolves.toEqual({
        likes: 0,
        dislikes: 0,
        commentCount: 0,
      });
    });
  });
});
