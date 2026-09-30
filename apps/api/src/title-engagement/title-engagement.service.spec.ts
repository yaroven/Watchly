import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementService } from "./title-engagement.service";

describe("TitleEngagementService", () => {
  let service: TitleEngagementService;
  let prismaMock: jest.Mocked<PrismaService>;

  const titleId = "11111111-1111-4111-8111-111111111111";
  const otherTitleId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleEngagementService,
        {
          provide: PrismaService,
          useValue: {
            title: { findUnique: jest.fn() },
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
          },
        },
      ],
    }).compile();

    service = module.get(TitleEngagementService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;

    (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({ id: titleId });
    (prismaMock.titleReaction.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prismaMock.titleReaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaMock.titleReaction.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.watchlistItem.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prismaMock.watchlistItem.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaMock.watchlistItem.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.watchlistItem.count as jest.Mock).mockResolvedValue(0);
  });

  afterEach(() => jest.clearAllMocks());

  describe("react", () => {
    it("should cast the vote if the viewer had not voted", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(prismaMock.titleReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { titleId_userId: { titleId, userId } },
          create: { titleId, userId, type: ReactionType.LIKE },
          update: { type: ReactionType.LIKE },
        }),
      );
    });

    it("should withdraw the vote if the viewer sent the one they already cast", async () => {
      (prismaMock.titleReaction.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.react(titleId, userId, ReactionType.LIKE);

      expect(prismaMock.titleReaction.upsert).not.toHaveBeenCalled();
      expect(result.myReaction).toBeNull();
    });

    it("should not read the existing vote before writing, so concurrent clicks cannot both insert", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(prismaMock.titleReaction.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId, titleId }) }),
      );
    });

    it("should reject a title that does not exist", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.react(titleId, userId, ReactionType.LIKE)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("watchlist", () => {
    it("should be idempotent when adding a title already on the list", async () => {
      await service.addToWatchlist(titleId, userId);

      expect(prismaMock.watchlistItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_titleId: { userId, titleId } },
          create: { userId, titleId },
          update: {},
        }),
      );
    });

    it("should not fail when removing a title that was never on the list", async () => {
      await expect(service.removeFromWatchlist(titleId, userId)).resolves.toBeDefined();
    });

    it("should return the viewer's own rows newest first", async () => {
      (prismaMock.watchlistItem.findMany as jest.Mock).mockResolvedValue([
        { titleId: otherTitleId },
        { titleId },
      ]);
      (prismaMock.watchlistItem.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findWatchlistTitleIds(userId, { page: 2, limit: 5 });

      expect(prismaMock.watchlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip: 5,
          take: 5,
        }),
      );
      expect(result).toEqual({ titleIds: [otherTitleId, titleId], totalCount: 2 });
    });
  });

  describe("summarizeMany", () => {
    it("should return a zeroed entry for a title nobody has touched", async () => {
      const result = await service.summarizeMany([titleId]);

      expect(result.get(titleId)).toEqual({
        likes: 0,
        dislikes: 0,
        watchlistCount: 0,
        myReaction: null,
        inWatchlist: false,
      });
    });

    it("should split likes from dislikes and carry the viewer's own state", async () => {
      (prismaMock.titleReaction.groupBy as jest.Mock).mockResolvedValue([
        { titleId, type: ReactionType.LIKE, _count: { _all: 7 } },
        { titleId, type: ReactionType.DISLIKE, _count: { _all: 2 } },
      ]);
      (prismaMock.watchlistItem.groupBy as jest.Mock).mockResolvedValue([
        { titleId, _count: { _all: 3 } },
      ]);
      (prismaMock.titleReaction.findMany as jest.Mock).mockResolvedValue([
        { titleId, type: ReactionType.DISLIKE },
      ]);
      (prismaMock.watchlistItem.findMany as jest.Mock).mockResolvedValue([{ titleId }]);

      const result = await service.summarizeMany([titleId], userId);

      expect(result.get(titleId)).toEqual({
        likes: 7,
        dislikes: 2,
        watchlistCount: 3,
        myReaction: ReactionType.DISLIKE,
        inWatchlist: true,
      });
    });

    it("should not query the viewer's own rows when anonymous", async () => {
      await service.summarizeMany([titleId]);

      expect(prismaMock.titleReaction.findMany).not.toHaveBeenCalled();
      expect(prismaMock.watchlistItem.findMany).not.toHaveBeenCalled();
    });

    it("should skip the database entirely for an empty list", async () => {
      const result = await service.summarizeMany([]);

      expect(result.size).toBe(0);
      expect(prismaMock.titleReaction.groupBy).not.toHaveBeenCalled();
    });
  });
});
