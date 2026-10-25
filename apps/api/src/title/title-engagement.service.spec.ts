import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ViewerVotesService } from "../reaction/viewer-votes.service";
import { TitleEngagementService } from "./title-engagement.service";

function createClientMocks() {
  return {
    title: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    titleRating: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    reaction: {
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
    engagementCounters: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
      deleteMany: jest.fn(),
    },
  };
}

function seed(client: ReturnType<typeof createClientMocks>, titleId: string) {
  client.title.findUnique.mockResolvedValue({ id: titleId });
  client.title.findMany.mockResolvedValue([]);
  client.title.count.mockResolvedValue(0);
  client.titleRating.deleteMany.mockResolvedValue({ count: 1 });
  client.titleRating.aggregate.mockResolvedValue({ _avg: { score: null }, _count: { _all: 0 } });
  client.titleRating.findMany.mockResolvedValue([]);
  client.reaction.deleteMany.mockResolvedValue({ count: 0 });
  client.reaction.groupBy.mockResolvedValue([]);
  client.reaction.findMany.mockResolvedValue([]);
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

describe("TitleEngagementService", () => {
  let service: TitleEngagementService;
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
        TitleEngagementService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ViewerVotesService,
          useValue: { forPage: jest.fn().mockResolvedValue(new Map()) },
        },
      ],
    }).compile();

    service = module.get(TitleEngagementService);

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
        engagement: counterRow(),
        counters: { likes: 4, dislikes: 1, commentCount: 2 },
        ratings: [{ score: 8 }],
        reactions: [{ type: ReactionType.LIKE }],
        watchlistEntries: [{ id: "w1" }],
      });
      // Both cached rows are relations: the counters carry the likes, the
      // title's own row the score and watchlist.

      const result = await service.getEngagement(titleId, userId);

      expect(result.likes).toBe(4);
      expect(result.dislikes).toBe(1);
      expect(result.commentCount).toBe(2);
      expect(result.viewer).toEqual({ score: 8, reaction: ReactionType.LIKE, inWatchlist: true });
    });

    it("should scope the viewer lookups to that viewer", async () => {
      await service.getEngagement(titleId, userId);

      const { select } = prismaMock.title.findUnique.mock.calls[0][0];
      for (const relation of ["ratings", "reactions", "watchlistEntries"]) {
        expect(select[relation]).toEqual(expect.objectContaining({ where: { userId } }));
      }
      // The viewer's reaction is a relation again, so it rides along with the
      // same read rather than costing a query of its own.
      expect(select.reactions).toEqual(expect.objectContaining({ where: { userId } }));
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

  function counterRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      titleId,
      avgScore: null,
      ratingCount: 0,
      watchlistCount: 0,
      ...overrides,
    };
  }
});
