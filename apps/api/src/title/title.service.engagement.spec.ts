import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { SeasonService } from "../season/season.service";
import { TitleService } from "./title.service";

function createClientMocks() {
  return {
    title: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    titleRating: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
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
    titleEngagement: { findMany: jest.fn(), upsert: jest.fn() },
  };
}

function seed(client: ReturnType<typeof createClientMocks>, titleId: string) {
  client.title.findUnique.mockResolvedValue({ id: titleId });
  client.title.findMany.mockResolvedValue([]);
  client.title.count.mockResolvedValue(0);
  client.titleRating.deleteMany.mockResolvedValue({ count: 1 });
  client.titleRating.aggregate.mockResolvedValue({ _avg: { score: null }, _count: { _all: 0 } });
  client.titleRating.findMany.mockResolvedValue([]);
  client.titleReaction.deleteMany.mockResolvedValue({ count: 0 });
  client.titleReaction.groupBy.mockResolvedValue([]);
  client.titleReaction.findMany.mockResolvedValue([]);
  client.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });
  client.watchlistItem.findMany.mockResolvedValue([]);
  client.watchlistItem.count.mockResolvedValue(0);
  client.titleEngagement.upsert.mockResolvedValue({ titleId });
}

function engagementRows(
  client: ReturnType<typeof createClientMocks>,
  rows: Record<string, unknown>,
) {
  client.title.findUnique.mockResolvedValue({ id: rows.id ?? null, engagement: null, ...rows });
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

    it("should refuse rather than commit a score against a title that vanished", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.rate(titleId, userId, 9)).rejects.toThrow(
        `Title with id ${titleId} not found`,
      );
    });
  });

  describe("removeRating", () => {
    it("should refuse when the viewer had not rated the title", async () => {
      txMock.titleRating.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeRating(titleId, userId)).rejects.toThrow(NotFoundException);
    });

    it("should delete only the viewer's own rating", async () => {
      await service.removeRating(titleId, userId);

      expect(txMock.titleRating.deleteMany).toHaveBeenCalledWith({ where: { titleId, userId } });
    });

    it("should report a missing title as not found, not as an unrated one", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.removeRating(titleId, userId)).rejects.toThrow(
        `Title with id ${titleId} not found`,
      );
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

      expect(txMock.title.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ select: expect.objectContaining({ engagement: true }) }),
      );
      expect(prismaMock.title.findUnique).not.toHaveBeenCalledWith(
        expect.objectContaining({ select: expect.objectContaining({ engagement: true }) }),
      );
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

  describe("removeReaction", () => {
    it("should delete only the viewer's own reaction", async () => {
      await service.removeReaction(titleId, userId);

      expect(txMock.titleReaction.deleteMany).toHaveBeenCalledWith({ where: { titleId, userId } });
    });

    it("should report a missing title as not found on the remove path too", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.removeReaction(titleId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getEngagement", () => {
    it("should answer for a title nobody has touched rather than throwing", async () => {
      const result = await service.getEngagement(titleId, null);

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
      engagementRows(prismaMock, {
        id: titleId,
        engagement: counterRow({ avgScore: 7.333333333, ratingCount: 3 }),
      });

      const result = await service.getEngagement(titleId, null);

      expect(result.averageScore).toBe(7.3);
    });

    it("should split likes from dislikes and carry the viewer's own state", async () => {
      engagementRows(prismaMock, {
        id: titleId,
        engagement: counterRow({ likes: 4, dislikes: 1 }),
        ratings: [{ score: 8 }],
        reactions: [{ type: ReactionType.LIKE }],
        watchlistEntries: [{ id: "w1" }],
      });

      const result = await service.getEngagement(titleId, userId);

      expect(result.likes).toBe(4);
      expect(result.dislikes).toBe(1);
      expect(result.viewer).toEqual({ score: 8, reaction: ReactionType.LIKE, inWatchlist: true });
    });

    it("should scope the viewer lookups to that viewer", async () => {
      await service.getEngagement(titleId, userId);

      const { select } = prismaMock.title.findUnique.mock.calls[0][0];
      for (const relation of ["ratings", "reactions", "watchlistEntries"]) {
        expect(select[relation]).toEqual(expect.objectContaining({ where: { userId } }));
      }
    });

    it("should report no viewer at all rather than a viewer with no state, when anonymous", async () => {
      const result = await service.getEngagement(titleId, null);

      expect(result.viewer).toBeNull();
      const { select } = prismaMock.title.findUnique.mock.calls[0][0];
      expect(select).not.toHaveProperty("ratings");
      expect(select).not.toHaveProperty("reactions");
      expect(select).not.toHaveProperty("watchlistEntries");
    });

    it("should report a missing title as not found rather than answering with zeroes", async () => {
      prismaMock.title.findUnique.mockResolvedValue(null);

      await expect(service.getEngagement(titleId, null)).rejects.toThrow(NotFoundException);
    });
  });

  describe("counter recompute", () => {
    it("should recompute the reaction counters inside the write transaction", async () => {
      txMock.titleReaction.deleteMany.mockResolvedValue({ count: 0 });
      txMock.titleReaction.groupBy.mockResolvedValue([
        { type: ReactionType.LIKE, _count: { _all: 4 } },
        { type: ReactionType.DISLIKE, _count: { _all: 1 } },
      ]);

      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleEngagement.upsert).toHaveBeenCalledWith({
        where: { titleId },
        create: { titleId, likes: 4, dislikes: 1 },
        update: { likes: 4, dislikes: 1 },
      });
      expect(prismaMock.titleEngagement.upsert).not.toHaveBeenCalled();
    });

    it("should write a zero for a reaction type that has no rows left", async () => {
      txMock.titleReaction.groupBy.mockResolvedValue([
        { type: ReactionType.DISLIKE, _count: { _all: 2 } },
      ]);

      await service.removeReaction(titleId, userId);

      expect(txMock.titleEngagement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { likes: 0, dislikes: 2 } }),
      );
    });

    it("should leave the average null once the last rating is gone", async () => {
      txMock.titleRating.aggregate.mockResolvedValue({
        _avg: { score: null },
        _count: { _all: 0 },
      });

      await service.removeRating(titleId, userId);

      expect(txMock.titleEngagement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { avgScore: null, ratingCount: 0 } }),
      );
    });

    it("should store the unrounded average, leaving the rounding to the DTO", async () => {
      txMock.titleRating.aggregate.mockResolvedValue({
        _avg: { score: 7.333333333 },
        _count: { _all: 3 },
      });

      await service.rate(titleId, userId, 9);

      expect(txMock.titleEngagement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { avgScore: 7.333333333, ratingCount: 3 } }),
      );
    });

    it("should count the whole watchlist for the title, not just the viewer's row", async () => {
      txMock.watchlistItem.count.mockResolvedValue(12);

      await service.recomputeWatchlistCounts(txMock as never, titleId);

      expect(txMock.watchlistItem.count).toHaveBeenCalledWith({ where: { titleId } });
      expect(txMock.titleEngagement.upsert).toHaveBeenCalledWith({
        where: { titleId },
        create: { titleId, watchlistCount: 12 },
        update: { watchlistCount: 12 },
      });
    });

    it("should not touch the other metrics when only reactions changed", async () => {
      txMock.titleReaction.deleteMany.mockResolvedValue({ count: 0 });

      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleRating.aggregate).not.toHaveBeenCalled();
      expect(txMock.watchlistItem.count).not.toHaveBeenCalled();
    });

    it("should recompute before reading the summary back", async () => {
      const calls: string[] = [];
      txMock.titleEngagement.upsert.mockImplementation(() => {
        calls.push("upsert");
        return Promise.resolve({ titleId });
      });
      txMock.title.findUnique.mockImplementation(() => {
        calls.push("read");
        return Promise.resolve({ id: titleId, engagement: null });
      });

      await service.rate(titleId, userId, 9);

      expect(calls).toEqual(["upsert", "read"]);
    });

    it("should not leave a counter row behind when the title vanished mid-write", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.rate(titleId, userId, 9)).rejects.toThrow(NotFoundException);
    });

    it("should not recompute when the viewer had nothing to withdraw", async () => {
      txMock.titleRating.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeRating(titleId, userId)).rejects.toThrow(NotFoundException);
      expect(txMock.titleEngagement.upsert).not.toHaveBeenCalled();
    });
  });

  describe("a page answers for every title", () => {
    it("should read a title with no engagement row as zeroes, not as a gap", async () => {
      const summaries = await pageThrough(service, [
        { id: titleId, engagement: counterRow({ avgScore: 6, ratingCount: 2 }) },
        { id: otherTitleId, engagement: null },
      ]);

      expect([...summaries.keys()].sort()).toEqual([titleId, otherTitleId].sort());
      expect(summaries.get(titleId)?.averageScore).toBe(6);
      expect(summaries.get(otherTitleId)?.averageScore).toBeNull();
      expect(summaries.get(otherTitleId)?.likes).toBe(0);
    });

    it("should load the engagement relation with the page rather than per title", async () => {
      await pageThrough(service, [{ id: titleId, engagement: null }]);

      expect(prismaMock.title.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining({ engagement: true }) }),
      );
    });
  });

  function counterRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      titleId,
      avgScore: null,
      ratingCount: 0,
      likes: 0,
      dislikes: 0,
      watchlistCount: 0,
      ...overrides,
    };
  }

  async function pageThrough(
    titleService: TitleService,
    rows: { id: string; engagement: unknown }[],
  ) {
    prismaMock.title.findMany.mockResolvedValue(
      rows.map((row) => ({ ...row, genres: [], externalRatings: [] })),
    );
    prismaMock.title.count.mockResolvedValue(rows.length);

    const page = await titleService.findAll({ page: 1, limit: 10 }, undefined, [], undefined);
    return new Map(page.items.map((item) => [item.id, item.engagement]));
  }
});
