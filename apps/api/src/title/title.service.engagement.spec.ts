import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { SeasonService } from "../season/season.service";
import { TitleService } from "./title.service";

/**
 * The engagement surface of TitleService — score, reactions, watchlist.
 *
 * Its own file rather than more of `title.service.spec.ts`, which is already 900
 * lines of catalogue behaviour: these cases need a transaction harness that
 * nothing else in that file uses, and the writes have to be shown landing on the
 * transaction client rather than on the base one.
 */
function createClientMocks() {
  return {
    title: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    titleRating: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    titleReaction: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    watchlistItem: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

function seed(client: ReturnType<typeof createClientMocks>, titleId: string) {
  client.title.findUnique.mockResolvedValue({ id: titleId });
  client.title.findMany.mockResolvedValue([]);
  client.title.count.mockResolvedValue(0);
  client.titleRating.deleteMany.mockResolvedValue({ count: 1 });
  client.titleRating.groupBy.mockResolvedValue([]);
  client.titleRating.findMany.mockResolvedValue([]);
  client.titleReaction.deleteMany.mockResolvedValue({ count: 0 });
  client.titleReaction.groupBy.mockResolvedValue([]);
  client.titleReaction.findMany.mockResolvedValue([]);
  client.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });
  client.watchlistItem.groupBy.mockResolvedValue([]);
  client.watchlistItem.findMany.mockResolvedValue([]);
  client.watchlistItem.count.mockResolvedValue(0);
}

describe("TitleService engagement", () => {
  let service: TitleService;
  let prismaMock: ReturnType<typeof createClientMocks> & { $transaction: jest.Mock };
  let txMock: ReturnType<typeof createClientMocks>;

  const titleId = "11111111-1111-4111-8111-111111111111";
  const otherTitleId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  beforeEach(async () => {
    txMock = createClientMocks();
    prismaMock = { ...createClientMocks(), $transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleService,
        { provide: PrismaService, useValue: prismaMock },
        // Unused here, but TitleService owns the catalogue too and will not
        // construct without them.
        { provide: PosterService, useValue: { toPublicUrl: jest.fn().mockReturnValue(null) } },
        { provide: SeasonService, useValue: {} },
        { provide: MediaAssetService, useValue: {} },
      ],
    }).compile();

    service = module.get(TitleService);

    seed(prismaMock, titleId);
    seed(txMock, titleId);
    prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock));
  });

  afterEach(() => jest.clearAllMocks());

  describe("rate", () => {
    it("should replace the existing score rather than add a second one", async () => {
      await service.rate(titleId, userId, 9);

      expect(txMock.titleRating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { titleId_userId: { titleId, userId } },
          update: { score: 9 },
        }),
      );
    });

    it("should write inside the transaction, never on the base client", async () => {
      await service.rate(titleId, userId, 9);

      expect(prismaMock.titleRating.upsert).not.toHaveBeenCalled();
    });

    it("should report a missing title as not found", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.rate(titleId, userId, 9)).rejects.toThrow(NotFoundException);
      expect(txMock.titleRating.upsert).not.toHaveBeenCalled();
    });
  });

  describe("removeRating", () => {
    it("should refuse when the viewer had not rated the title", async () => {
      txMock.titleRating.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeRating(titleId, userId)).rejects.toThrow(NotFoundException);
    });

    // The hazard this guards: `userId: undefined` in a Prisma `where` reads as
    // "no filter", so one person withdrawing a score would wipe everyone's.
    it("should delete only the viewer's own rating", async () => {
      await service.removeRating(titleId, userId);

      expect(txMock.titleRating.deleteMany).toHaveBeenCalledWith({ where: { titleId, userId } });
    });
  });

  describe("react", () => {
    it("should scope the withdrawal probe to this viewer and this vote", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.deleteMany).toHaveBeenCalledWith({
        where: { titleId, userId, type: ReactionType.LIKE },
      });
    });

    it("should cast the vote if the viewer had not voted", async () => {
      txMock.titleReaction.deleteMany.mockResolvedValue({ count: 0 });

      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { type: ReactionType.LIKE } }),
      );
    });

    it("should withdraw the vote if the viewer sent the one they already cast", async () => {
      txMock.titleReaction.deleteMany.mockResolvedValue({ count: 1 });

      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.upsert).not.toHaveBeenCalled();
    });

    it("should write inside the transaction, never on the base client", async () => {
      txMock.titleReaction.deleteMany.mockResolvedValue({ count: 0 });

      await service.react(titleId, userId, ReactionType.LIKE);

      expect(prismaMock.titleReaction.upsert).not.toHaveBeenCalled();
      expect(prismaMock.titleReaction.deleteMany).not.toHaveBeenCalled();
    });

    it("should read the summary back from inside the same transaction", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.groupBy).toHaveBeenCalled();
      expect(prismaMock.titleReaction.groupBy).not.toHaveBeenCalled();
    });

    it("should reject, committing nothing, when the write fails", async () => {
      txMock.titleReaction.deleteMany.mockRejectedValue(new Error("db down"));

      await expect(service.react(titleId, userId, ReactionType.LIKE)).rejects.toThrow("db down");
      expect(txMock.titleReaction.upsert).not.toHaveBeenCalled();
    });

    it("should report a missing title as not found", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.react(titleId, userId, ReactionType.LIKE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("watchlist", () => {
    it("should be idempotent when adding a title already on the list", async () => {
      await service.addToWatchlist(titleId, userId);

      expect(txMock.watchlistItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_titleId: { userId, titleId } },
          update: {},
        }),
      );
    });

    it("should delete only the viewer's own row", async () => {
      await service.removeFromWatchlist(titleId, userId);

      expect(txMock.watchlistItem.deleteMany).toHaveBeenCalledWith({ where: { userId, titleId } });
    });

    it("should delete only the viewer's own reaction", async () => {
      await service.removeReaction(titleId, userId);

      expect(txMock.titleReaction.deleteMany).toHaveBeenCalledWith({ where: { titleId, userId } });
    });

    it("should report a missing title as not found on the remove paths too", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.removeFromWatchlist(titleId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("summarizeEngagement", () => {
    it("should answer for a title nobody has touched rather than throwing", async () => {
      const result = await service.summarizeEngagement(titleId, null);

      expect(result).toEqual(
        expect.objectContaining({
          averageScore: null,
          ratingCount: 0,
          likes: 0,
          dislikes: 0,
          watchlistCount: 0,
          viewer: null,
        }),
      );
    });

    it("should round the average to one decimal, so it matches what the UI renders", async () => {
      prismaMock.titleRating.groupBy.mockResolvedValue([
        { titleId, _avg: { score: 7.333333333 }, _count: { _all: 3 } },
      ]);

      const result = await service.summarizeEngagement(titleId, null);

      expect(result.averageScore).toBe(7.3);
    });

    it("should split likes from dislikes and carry the viewer's own state", async () => {
      prismaMock.titleReaction.groupBy.mockResolvedValue([
        { titleId, type: ReactionType.LIKE, _count: { _all: 4 } },
        { titleId, type: ReactionType.DISLIKE, _count: { _all: 1 } },
      ]);
      prismaMock.titleRating.findMany.mockResolvedValue([{ titleId, score: 8 }]);
      prismaMock.titleReaction.findMany.mockResolvedValue([{ titleId, type: ReactionType.LIKE }]);
      prismaMock.watchlistItem.findMany.mockResolvedValue([{ titleId }]);

      const result = await service.summarizeEngagement(titleId, userId);

      expect(result.likes).toBe(4);
      expect(result.dislikes).toBe(1);
      expect(result.viewer).toEqual({ score: 8, reaction: ReactionType.LIKE, inWatchlist: true });
    });

    it("should scope the viewer lookups to that viewer", async () => {
      await service.summarizeEngagement(titleId, userId);

      for (const delegate of [
        prismaMock.titleRating,
        prismaMock.titleReaction,
        prismaMock.watchlistItem,
      ]) {
        expect(delegate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: expect.objectContaining({ userId }) }),
        );
      }
    });

    // null is "we did not ask", which the client renders as unknown. A viewer
    // object full of nulls would read as "asked, and they have done nothing".
    it("should report no viewer at all rather than a viewer with no state, when anonymous", async () => {
      const result = await service.summarizeEngagement(titleId, null);

      expect(result.viewer).toBeNull();
      expect(prismaMock.titleRating.findMany).not.toHaveBeenCalled();
      expect(prismaMock.titleReaction.findMany).not.toHaveBeenCalled();
      expect(prismaMock.watchlistItem.findMany).not.toHaveBeenCalled();
    });

    it("should report a missing title as not found rather than answering with zeroes", async () => {
      prismaMock.title.findUnique.mockResolvedValue(null);

      await expect(service.summarizeEngagement(titleId, null)).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * The densification `toResponse` depends on: `groupBy` only answers for rows
   * that exist, and a miss in the map is treated as a broken invariant, not zero.
   */
  describe("the aggregate map is total", () => {
    it("should answer for every id in the batch, not just the ones with rows", async () => {
      prismaMock.titleRating.groupBy.mockResolvedValue([
        { titleId, _avg: { score: 6 }, _count: { _all: 2 } },
      ]);
      prismaMock.titleReaction.groupBy.mockResolvedValue([
        { titleId: otherTitleId, type: ReactionType.LIKE, _count: { _all: 1 } },
      ]);

      // Reached through findAll, which is the only caller of the many-variant.
      const summaries = await summarizeManyThrough(service, [titleId, otherTitleId]);

      expect([...summaries.keys()].sort()).toEqual([titleId, otherTitleId].sort());
      expect(summaries.get(titleId)?.averageScore).toBe(6);
      expect(summaries.get(otherTitleId)?.averageScore).toBeNull();
      expect(summaries.get(otherTitleId)?.likes).toBe(1);
    });
  });

  /** `summarizeEngagementMany` is private; reach it the way production does. */
  async function summarizeManyThrough(titleService: TitleService, ids: string[]) {
    const rows = ids.map((id) => ({ id, genres: [], externalRatings: [] }));
    prismaMock.title.findMany.mockResolvedValue(rows);
    prismaMock.title.count.mockResolvedValue(rows.length);

    const page = await titleService.findAll({ page: 1, limit: 10 }, undefined, [], undefined);
    return new Map(page.items.map((item) => [item.id, item.engagement]));
  }
});
