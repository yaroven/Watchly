import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../../engagement/engagement-counters.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RECONCILE_BATCH_SIZE, ReactionReconciler } from "./reaction-reconciler.service";

const { LIKE, DISLIKE } = ReactionType;

type Key = "titleId" | "commentId";
type Row = Record<string, unknown>;

const likeRow = (key: Key, id: string, count: number): Row => ({
  [key]: id,
  type: LIKE,
  _count: { _all: count },
});

const keyOf = (where: Record<string, unknown>): Key =>
  "titleId" in where ? "titleId" : "commentId";

const inPage = (rows: Row[], where: Record<string, { in: string[] }>): Row[] => {
  const key = keyOf(where);
  return rows.filter((row) => row[key] !== undefined && where[key].in.includes(row[key] as string));
};

const pageOf = (ids: string[], where: { id?: { gt: string } } | undefined, take: number) =>
  [...ids]
    .sort()
    .filter((id) => !where?.id || id > where.id.gt)
    .slice(0, take)
    .map((id) => ({ id }));

const ids = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${String(index).padStart(5, "0")}`);

describe("ReactionReconciler", () => {
  let reconciler: ReactionReconciler;
  let prisma: {
    title: { findMany: jest.Mock };
    comment: { findMany: jest.Mock };
    reaction: { groupBy: jest.Mock };
    engagementCounters: { findMany: jest.Mock };
  };
  let counters: { recomputeReactions: jest.Mock };
  let redis: { set: jest.Mock };

  let titleIds: string[];
  let commentIds: string[];
  let reactionRows: Row[];
  let counterRows: Row[];

  beforeEach(async () => {
    titleIds = [];
    commentIds = [];
    reactionRows = [];
    counterRows = [];

    const page =
      (source: () => string[]) =>
      ({ where, take }: { where?: { id?: { gt: string } }; take: number }) =>
        Promise.resolve(pageOf(source(), where, take));

    prisma = {
      title: { findMany: jest.fn(page(() => titleIds)) },
      comment: { findMany: jest.fn(page(() => commentIds)) },
      reaction: {
        groupBy: jest.fn(({ where }: { where: Record<string, { in: string[] }> }) =>
          Promise.resolve(inPage(reactionRows, where)),
        ),
      },
      engagementCounters: {
        findMany: jest.fn(({ where }: { where: Record<string, { in: string[] }> }) =>
          Promise.resolve(inPage(counterRows, where)),
        ),
      },
    };
    counters = { recomputeReactions: jest.fn().mockResolvedValue(undefined) };
    redis = { set: jest.fn().mockResolvedValue("OK") };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionReconciler,
        { provide: PrismaService, useValue: prisma },
        { provide: EngagementCountersService, useValue: counters },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    reconciler = moduleRef.get(ReactionReconciler);
  });

  afterEach(() => jest.clearAllMocks());

  describe("what counts as drift", () => {
    beforeEach(() => {
      titleIds = ["title-1"];
    });

    it("leaves a subject alone when the counter already agrees", async () => {
      reactionRows = [likeRow("titleId", "title-1", 3)];
      counterRows = [{ titleId: "title-1", likes: 3, dislikes: 0 }];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).not.toHaveBeenCalled();
    });

    it("repairs a counter that disagrees with the rows", async () => {
      reactionRows = [likeRow("titleId", "title-1", 3)];
      counterRows = [{ titleId: "title-1", likes: 1, dislikes: 0 }];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
    });

    it("repairs a subject with reactions and no counter row at all", async () => {
      reactionRows = [likeRow("titleId", "title-1", 2)];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
    });

    it("repairs a counter whose reactions have disappeared", async () => {
      counterRows = [{ titleId: "title-1", likes: 4, dislikes: 1 }];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
    });

    it("checks both arcs, not just titles", async () => {
      commentIds = ["comment-1"];
      reactionRows = [likeRow("commentId", "comment-1", 1)];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ commentId: "comment-1" }, prisma);
    });

    it("notices a dislike count that drifted while the likes agreed", async () => {
      reactionRows = [
        likeRow("titleId", "title-1", 3),
        { titleId: "title-1", type: DISLIKE, _count: { _all: 2 } },
      ];
      counterRows = [{ titleId: "title-1", likes: 3, dislikes: 0 }];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
    });

    it("reads each type into its own counter rather than summing them", async () => {
      reactionRows = [
        likeRow("titleId", "title-1", 3),
        { titleId: "title-1", type: DISLIKE, _count: { _all: 2 } },
      ];
      counterRows = [{ titleId: "title-1", likes: 3, dislikes: 2 }];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).not.toHaveBeenCalled();
    });
  });

  describe("walking the subjects in pages", () => {
    it("asks the aggregates only about the page in hand", async () => {
      titleIds = ids("title", 3);

      await reconciler.reconcile();

      expect(prisma.reaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { titleId: { in: titleIds } } }),
      );
      expect(prisma.engagementCounters.findMany).toHaveBeenCalledWith({
        where: { titleId: { in: titleIds } },
      });
    });

    it("continues after the last id of a full page", async () => {
      titleIds = ids("title", RECONCILE_BATCH_SIZE + 5);
      const lastOfFirstPage = titleIds[RECONCILE_BATCH_SIZE - 1];

      await reconciler.reconcile();

      expect(prisma.title.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.title.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { id: { gt: lastOfFirstPage } } }),
      );
      expect(prisma.reaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { titleId: { in: titleIds.slice(RECONCILE_BATCH_SIZE) } },
        }),
      );
    });

    it("never asks about more than one page at a time", async () => {
      titleIds = ids("title", RECONCILE_BATCH_SIZE * 2 + 1);

      await reconciler.reconcile();

      for (const [{ where }] of prisma.reaction.groupBy.mock.calls as [
        { where: Record<string, { in: string[] }> },
      ][]) {
        expect(where[keyOf(where)].in.length).toBeLessThanOrEqual(RECONCILE_BATCH_SIZE);
      }
    });

    it("stops after a short page without asking for another", async () => {
      titleIds = ids("title", 3);

      await reconciler.reconcile();

      expect(prisma.title.findMany).toHaveBeenCalledTimes(1);
    });

    it("asks for nothing more when an arc has no subjects", async () => {
      await reconciler.reconcile();

      expect(prisma.reaction.groupBy).not.toHaveBeenCalled();
      expect(prisma.engagementCounters.findMany).not.toHaveBeenCalled();
    });

    it("repairs drift found on every page, not just the first", async () => {
      titleIds = ids("title", RECONCILE_BATCH_SIZE + 1);
      const onSecondPage = titleIds[RECONCILE_BATCH_SIZE];
      reactionRows = [likeRow("titleId", titleIds[0], 1), likeRow("titleId", onSecondPage, 1)];

      await reconciler.reconcile();

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: onSecondPage }, prisma);
      expect(redis.set).toHaveBeenCalledWith("reactions:drift:title", 2);
    });
  });

  describe("reporting", () => {
    it("publishes what it repaired, per arc", async () => {
      titleIds = ["title-1"];
      reactionRows = [likeRow("titleId", "title-1", 3)];

      await reconciler.reconcile();

      expect(redis.set).toHaveBeenCalledWith("reactions:drift:title", 1);
      expect(redis.set).toHaveBeenCalledWith("reactions:drift:comment", 0);
    });

    it("still repairs when the drift cannot be published", async () => {
      titleIds = ["title-1"];
      reactionRows = [likeRow("titleId", "title-1", 3)];
      redis.set.mockRejectedValue(new Error("redis is down"));

      await expect(reconciler.reconcile()).resolves.toBeUndefined();
      expect(counters.recomputeReactions).toHaveBeenCalled();
    });
  });
});
