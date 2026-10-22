import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { TitleService } from "../title/title.service";
import { WatchlistService } from "./watchlist.service";

describe("WatchlistService", () => {
  let service: WatchlistService;
  let prismaMock: {
    watchlistItem: {
      findMany: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    title: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let titleServiceMock: {
    findManyByIds: jest.Mock;
    readEngagement: jest.Mock;
    recomputeWatchlistCounts: jest.Mock;
  };
  let txMock: {
    watchlistItem: { upsert: jest.Mock; deleteMany: jest.Mock };
    title: { findUnique: jest.Mock };
  };

  const viewerId = "viewer-1";
  const titleId = "title-a";

  beforeEach(async () => {
    txMock = {
      watchlistItem: { upsert: jest.fn(), deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      title: { findUnique: jest.fn().mockResolvedValue({ id: titleId }) },
    };
    prismaMock = {
      watchlistItem: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      title: { findUnique: jest.fn().mockResolvedValue({ id: titleId }) },
      $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock)),
    };
    titleServiceMock = {
      findManyByIds: jest.fn().mockResolvedValue([]),
      readEngagement: jest.fn().mockResolvedValue({ watchlistCount: 0 }),
      recomputeWatchlistCounts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TitleService, useValue: titleServiceMock },
      ],
    }).compile();

    service = module.get(WatchlistService);
  });

  afterEach(() => jest.clearAllMocks());

  const watchlistPage = (titleIds: string[], totalCount: number) => {
    prismaMock.watchlistItem.findMany.mockResolvedValueOnce(
      titleIds.map((id) => ({ titleId: id })),
    );
    prismaMock.watchlistItem.count.mockResolvedValue(totalCount);
  };

  describe("findAll", () => {
    it("should return the titles in the order the watchlist gave them, not the database's", async () => {
      watchlistPage(["title-b", "title-a"], 2);
      titleServiceMock.findManyByIds.mockResolvedValue([{ id: "title-a" }, { id: "title-b" }]);

      const result = await service.findAll(viewerId, {});

      expect(result.items.map((item) => item.id)).toEqual(["title-b", "title-a"]);
      expect(result.totalCount).toBe(2);
    });

    it("should forward the viewer, or every row renders as unsaved", async () => {
      watchlistPage(["title-a"], 1);

      await service.findAll(viewerId, {});

      expect(titleServiceMock.findManyByIds).toHaveBeenCalledWith(["title-a"], viewerId);
    });

    it("should drop a title that no longer exists, and not count it either", async () => {
      watchlistPage(["title-a", "gone"], 2);
      titleServiceMock.findManyByIds.mockResolvedValue([{ id: "title-a" }]);

      const result = await service.findAll(viewerId, {});

      expect(result.items.map((item) => item.id)).toEqual(["title-a"]);
      expect(result.totalCount).toBe(1);
    });

    it("should not ask for titles at all for an empty watchlist", async () => {
      watchlistPage([], 0);

      const result = await service.findAll(viewerId, {});

      expect(result).toEqual({ items: [], totalCount: 0 });
      expect(titleServiceMock.findManyByIds).not.toHaveBeenCalled();
    });

    it("should scope the id page to the viewer and exclude orphaned rows", async () => {
      await service.findAll(viewerId, {});

      expect(prismaMock.watchlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: viewerId, title: { is: {} } } }),
      );
      expect(prismaMock.watchlistItem.count).toHaveBeenCalledWith({
        where: { userId: viewerId, title: { is: {} } },
      });
    });
  });

  describe("add", () => {
    it("should be idempotent when the title is already on the list", async () => {
      await service.add(titleId, viewerId);

      expect(txMock.watchlistItem.upsert).toHaveBeenCalledWith({
        where: { userId_titleId: { userId: viewerId, titleId } },
        create: { userId: viewerId, titleId },
        update: {},
      });
    });

    it("should write inside the transaction, never on the base client", async () => {
      await service.add(titleId, viewerId);

      expect(prismaMock.watchlistItem.upsert).not.toHaveBeenCalled();
    });

    it("should recompute the counter and read the block back from the same transaction", async () => {
      await service.add(titleId, viewerId);

      expect(titleServiceMock.recomputeWatchlistCounts).toHaveBeenCalledWith(txMock, titleId);
      expect(titleServiceMock.readEngagement).toHaveBeenCalledWith(txMock, titleId, viewerId);
    });

    it("should refuse rather than commit against a title that vanished", async () => {
      titleServiceMock.readEngagement.mockRejectedValue(new NotFoundException("not found"));

      await expect(service.add(titleId, viewerId)).rejects.toThrow("not found");
    });
  });

  describe("remove", () => {
    it("should delete only the viewer's own row", async () => {
      await service.remove(titleId, viewerId);

      expect(txMock.watchlistItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: viewerId, titleId },
      });
    });

    it("should recompute the counter after the delete", async () => {
      await service.remove(titleId, viewerId);

      expect(titleServiceMock.recomputeWatchlistCounts).toHaveBeenCalledWith(txMock, titleId);
    });

    it("should refuse rather than commit against a title that vanished", async () => {
      titleServiceMock.readEngagement.mockRejectedValue(new NotFoundException("not found"));

      await expect(service.remove(titleId, viewerId)).rejects.toThrow("not found");
    });
  });
});
