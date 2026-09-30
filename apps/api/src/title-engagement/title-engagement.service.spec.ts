import { BadRequestException, UnauthorizedException } from "@nestjs/common";
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
            $transaction: jest.fn(),
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

    (prismaMock.$transaction as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prismaMock),
    );
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

    it("should switch sides in place when the viewer had cast the opposite vote", async () => {
      // The delete is filtered by `type`, so an existing DISLIKE is not matched and
      // the upsert flips it. Drop that filter and this becomes a silent withdrawal.
      (prismaMock.titleReaction.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaMock.titleReaction.findMany as jest.Mock).mockResolvedValue([
        { titleId, type: ReactionType.LIKE },
      ]);

      const result = await service.react(titleId, userId, ReactionType.LIKE);

      expect(prismaMock.titleReaction.deleteMany).toHaveBeenCalledWith({
        where: { titleId, userId, type: ReactionType.LIKE },
      });
      expect(prismaMock.titleReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { type: ReactionType.LIKE } }),
      );
      expect(result.myReaction).toBe(ReactionType.LIKE);
    });

    it("should decide on the delete's row count rather than a preceding read", async () => {
      const calls: string[] = [];
      (prismaMock.titleReaction.deleteMany as jest.Mock).mockImplementation(() => {
        calls.push("deleteMany");
        return Promise.resolve({ count: 0 });
      });
      (prismaMock.titleReaction.upsert as jest.Mock).mockImplementation(() => {
        calls.push("upsert");
        return Promise.resolve({});
      });

      await service.react(titleId, userId, ReactionType.LIKE);

      // No read of the viewer's row stands between the two writes — the only
      // findMany is the summary built afterwards.
      expect(calls).toEqual(["deleteMany", "upsert"]);
    });

    it("should run both writes in one transaction so a failed write cannot lose the vote", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should reject an unidentified viewer rather than writing without a userId filter", async () => {
      await expect(service.react(titleId, undefined, ReactionType.LIKE)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.titleReaction.deleteMany).not.toHaveBeenCalled();
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

    it("should reject a title that does not exist on the remove paths too", async () => {
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.removeFromWatchlist(titleId, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeReaction(titleId, userId)).rejects.toThrow(BadRequestException);
    });

    it("should reject an unidentified viewer rather than deleting every user's row", async () => {
      await expect(service.removeFromWatchlist(titleId, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.watchlistItem.deleteMany).not.toHaveBeenCalled();
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
