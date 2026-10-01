import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TitleEngagementService } from "./title-engagement.service";

/** The writes have to land on the transaction client, so it gets its own mocks. */
function createClientMocks() {
  return {
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
  };
}

function seed(client: ReturnType<typeof createClientMocks>, titleId: string) {
  client.title.findUnique.mockResolvedValue({ id: titleId });
  client.titleReaction.deleteMany.mockResolvedValue({ count: 0 });
  client.titleReaction.groupBy.mockResolvedValue([]);
  client.titleReaction.findMany.mockResolvedValue([]);
  client.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });
  client.watchlistItem.groupBy.mockResolvedValue([]);
  client.watchlistItem.findMany.mockResolvedValue([]);
  client.watchlistItem.count.mockResolvedValue(0);
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
      providers: [TitleEngagementService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(TitleEngagementService);

    seed(prismaMock, titleId);
    seed(txMock, titleId);
    prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock));
  });

  afterEach(() => jest.clearAllMocks());

  describe("react", () => {
    it("should scope the withdrawal probe to this viewer and this vote", async () => {
      // Without `userId` here one person un-liking withdraws every user's LIKE
      // on the title; without `type` a side-switch becomes a withdrawal.
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.deleteMany).toHaveBeenCalledWith({
        where: { titleId, userId, type: ReactionType.LIKE },
      });
    });

    it("should cast the vote if the viewer had not voted", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { titleId_userId: { titleId, userId } },
          create: { titleId, userId, type: ReactionType.LIKE },
          update: { type: ReactionType.LIKE },
        }),
      );
    });

    it("should withdraw the vote if the viewer sent the one they already cast", async () => {
      txMock.titleReaction.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.upsert).not.toHaveBeenCalled();
      expect(result.viewer?.myReaction).toBeNull();
    });

    it("should switch sides when the viewer holds the opposite vote", async () => {
      // A row the mocks actually maintain, rather than a hard-coded delete count:
      // the count has to follow from the where clause, or dropping the `type`
      // filter — which turns a side-switch into a silent withdrawal — still
      // produces count 0 and the test passes on a broken service.
      let existing: ReactionType | null = ReactionType.DISLIKE;
      txMock.titleReaction.deleteMany.mockImplementation(
        ({ where }: { where: { type?: ReactionType } }) => {
          const matches =
            existing !== null && (where.type === undefined || where.type === existing);
          if (matches) existing = null;
          return Promise.resolve({ count: matches ? 1 : 0 });
        },
      );
      txMock.titleReaction.upsert.mockImplementation(
        ({ update }: { update: { type: ReactionType } }) => {
          existing = update.type;
          return Promise.resolve({});
        },
      );
      txMock.titleReaction.findMany.mockImplementation(() =>
        Promise.resolve(existing ? [{ titleId, type: existing }] : []),
      );

      const result = await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { type: ReactionType.LIKE } }),
      );
      expect(result.viewer?.myReaction).toBe(ReactionType.LIKE);
    });

    it("should write inside the transaction, never on the base client", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.deleteMany).toHaveBeenCalled();
      expect(txMock.titleReaction.upsert).toHaveBeenCalled();
      expect(prismaMock.titleReaction.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.titleReaction.upsert).not.toHaveBeenCalled();
    });

    it("should use one transaction, so the write and its read-back cannot be split apart", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      // Two sequential transactions would satisfy "never on the base client"
      // while letting the delete commit and the upsert fail after it.
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should read the summary back from inside the same transaction", async () => {
      await service.react(titleId, userId, ReactionType.LIKE);

      expect(txMock.titleReaction.groupBy).toHaveBeenCalled();
      expect(prismaMock.titleReaction.groupBy).not.toHaveBeenCalled();
    });

    it("should reject, committing nothing, when the write fails", async () => {
      txMock.titleReaction.upsert.mockRejectedValue(new Error("deadlock"));

      await expect(service.react(titleId, userId, ReactionType.LIKE)).rejects.toThrow("deadlock");
    });

    it("should decide on the delete's row count rather than on a read of the viewer's row", async () => {
      const calls: string[] = [];
      const record = (name: string, result: unknown) => () => {
        calls.push(name);
        return Promise.resolve(result);
      };
      txMock.titleReaction.deleteMany.mockImplementation(record("deleteMany", { count: 0 }));
      txMock.titleReaction.upsert.mockImplementation(record("upsert", {}));
      txMock.titleReaction.findMany.mockImplementation(record("findMany", []));

      await service.react(titleId, userId, ReactionType.LIKE);

      // findMany appears only after both writes — it is the summary read-back, not
      // a lookup standing between them.
      expect(calls).toEqual(["deleteMany", "upsert", "findMany"]);
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
          create: { userId, titleId },
          update: {},
        }),
      );
    });

    it("should delete only the viewer's own row", async () => {
      // An unfiltered delete would wipe every user's row for this title and still
      // answer 200, so the where clause is the assertion that matters.
      const result = await service.removeFromWatchlist(titleId, userId);

      expect(txMock.watchlistItem.deleteMany).toHaveBeenCalledWith({ where: { userId, titleId } });
      expect(result.viewer?.inWatchlist).toBe(false);
    });

    it("should delete only the viewer's own reaction", async () => {
      await service.removeReaction(titleId, userId);

      expect(txMock.titleReaction.deleteMany).toHaveBeenCalledWith({ where: { titleId, userId } });
    });

    it("should report a missing title as not found on the remove paths too", async () => {
      txMock.title.findUnique.mockResolvedValue(null);

      await expect(service.removeFromWatchlist(titleId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.removeReaction(titleId, userId)).rejects.toThrow(NotFoundException);
    });

    it("should return the viewer's own rows newest first", async () => {
      prismaMock.watchlistItem.findMany.mockResolvedValue([{ titleId: otherTitleId }, { titleId }]);
      prismaMock.watchlistItem.count.mockResolvedValue(2);

      const result = await service.findWatchlistTitleIds(userId, { page: 2, limit: 5 });

      // Filtered through `title` so the page and the count cannot disagree.
      expect(prismaMock.watchlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, title: { is: {} } },
          orderBy: { createdAt: "desc" },
          skip: 5,
          take: 5,
        }),
      );
      expect(prismaMock.watchlistItem.count).toHaveBeenCalledWith({
        where: { userId, title: { is: {} } },
      });
      expect(result).toEqual({ titleIds: [otherTitleId, titleId], totalCount: 2 });
    });
  });

  describe("summarizeMany", () => {
    it("should answer for a title nobody has touched rather than omitting it", async () => {
      const result = await service.summarizeMany([titleId], null);

      expect(result.get(titleId)).toEqual({
        likes: 0,
        dislikes: 0,
        watchlistCount: 0,
        viewer: null,
      });
    });

    it("should split likes from dislikes and carry the viewer's own state", async () => {
      prismaMock.titleReaction.groupBy.mockResolvedValue([
        { titleId, type: ReactionType.LIKE, _count: { _all: 7 } },
        { titleId, type: ReactionType.DISLIKE, _count: { _all: 2 } },
      ]);
      prismaMock.watchlistItem.groupBy.mockResolvedValue([{ titleId, _count: { _all: 3 } }]);
      prismaMock.titleReaction.findMany.mockResolvedValue([
        { titleId, type: ReactionType.DISLIKE },
      ]);
      prismaMock.watchlistItem.findMany.mockResolvedValue([{ titleId }]);

      const result = await service.summarizeMany([titleId], userId);

      expect(result.get(titleId)).toEqual({
        likes: 7,
        dislikes: 2,
        watchlistCount: 3,
        viewer: { myReaction: ReactionType.DISLIKE, inWatchlist: true },
      });
    });

    it("should scope the viewer lookup to that viewer", async () => {
      await service.summarizeMany([titleId], userId);

      expect(prismaMock.titleReaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId, titleId: { in: [titleId] } } }),
      );
    });

    // "Nobody asked" must not render as "asked, and the answer is no" — a client
    // cannot tell those apart once they serialise the same.
    it("should report no viewer at all rather than a viewer with no state, when anonymous", async () => {
      const result = await service.summarizeMany([titleId], null);

      expect(result.get(titleId)?.viewer).toBeNull();
      expect(prismaMock.titleReaction.findMany).not.toHaveBeenCalled();
      expect(prismaMock.watchlistItem.findMany).not.toHaveBeenCalled();
    });

    it("should answer for every id in the batch, not just the first", async () => {
      // The list and watchlist pages read through here. Answering for a subset
      // would leave the rest looking like "we did not ask", which the client
      // renders as unknown and disables.
      prismaMock.titleReaction.groupBy.mockResolvedValue([
        { titleId: otherTitleId, type: ReactionType.LIKE, _count: { _all: 4 } },
      ]);
      prismaMock.watchlistItem.groupBy.mockResolvedValue([
        { titleId: otherTitleId, _count: { _all: 1 } },
      ]);

      const result = await service.summarizeMany([titleId, otherTitleId], null);

      expect([...result.keys()]).toEqual([titleId, otherTitleId]);
      // The id with no rows still gets a zeroed entry rather than being dropped.
      expect(result.get(titleId)).toEqual({
        likes: 0,
        dislikes: 0,
        watchlistCount: 0,
        viewer: null,
      });
      expect(result.get(otherTitleId)?.likes).toBe(4);
      expect(result.get(otherTitleId)?.watchlistCount).toBe(1);
    });

    it("should report a missing title as not found rather than answering with zeroes", async () => {
      prismaMock.title.findUnique.mockResolvedValue(null);

      await expect(service.summarize(titleId, null)).rejects.toThrow(NotFoundException);
    });

    it("should skip the database entirely for an empty list", async () => {
      const result = await service.summarizeMany([], userId);

      expect(result.size).toBe(0);
      expect(prismaMock.titleReaction.groupBy).not.toHaveBeenCalled();
    });
  });
});
