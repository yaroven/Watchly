import { Test } from "@nestjs/testing";
import { Prisma, ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../../engagement/engagement-counters.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ReactionReconciler } from "./reaction-reconciler.service";

const { LIKE, DISLIKE } = ReactionType;

type GroupRow = Record<string, unknown>;

const likeRow = (field: "titleId" | "commentId", id: string, count: number): GroupRow => ({
  [field]: id,
  type: LIKE,
  _count: { _all: count },
});

describe("ReactionReconciler", () => {
  let reconciler: ReactionReconciler;
  let prisma: {
    reaction: { groupBy: jest.Mock };
    engagementCounters: { findMany: jest.Mock };
  };
  let counters: { recomputeReactions: jest.Mock };
  let redis: { set: jest.Mock };

  const sweep = (titles: GroupRow[] = [], comments: GroupRow[] = []) => {
    prisma.reaction.groupBy.mockImplementation(({ by }: { by: string[] }) =>
      Promise.resolve(by.includes("titleId") ? titles : comments),
    );
  };

  const counterRows = (titles: GroupRow[] = [], comments: GroupRow[] = []) => {
    prisma.engagementCounters.findMany.mockImplementation(
      ({ where }: { where: Prisma.EngagementCountersWhereInput }) =>
        Promise.resolve("titleId" in where ? titles : comments),
    );
  };

  beforeEach(async () => {
    prisma = {
      reaction: { groupBy: jest.fn().mockResolvedValue([]) },
      engagementCounters: { findMany: jest.fn().mockResolvedValue([]) },
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

  it("leaves a subject alone when the counter already agrees", async () => {
    sweep([likeRow("titleId", "title-1", 3)]);
    counterRows([{ titleId: "title-1", likes: 3, dislikes: 0 }]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).not.toHaveBeenCalled();
  });

  it("repairs a counter that disagrees with the rows", async () => {
    sweep([likeRow("titleId", "title-1", 3)]);
    counterRows([{ titleId: "title-1", likes: 1, dislikes: 0 }]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
  });

  it("repairs a subject with reactions and no counter row at all", async () => {
    sweep([likeRow("titleId", "title-1", 2)]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
  });

  it("repairs a counter whose reactions have disappeared", async () => {
    counterRows([{ titleId: "title-1", likes: 4, dislikes: 1 }]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
  });

  it("checks both arcs, not just titles", async () => {
    sweep([], [likeRow("commentId", "comment-1", 1)]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).toHaveBeenCalledWith({ commentId: "comment-1" }, prisma);
  });

  it("notices a dislike count that drifted while the likes agreed", async () => {
    sweep([
      likeRow("titleId", "title-1", 3),
      { titleId: "title-1", type: DISLIKE, _count: { _all: 2 } },
    ]);
    counterRows([{ titleId: "title-1", likes: 3, dislikes: 0 }]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).toHaveBeenCalledWith({ titleId: "title-1" }, prisma);
  });

  it("reads each type into its own counter rather than summing them", async () => {
    sweep([
      likeRow("titleId", "title-1", 3),
      { titleId: "title-1", type: DISLIKE, _count: { _all: 2 } },
    ]);
    counterRows([{ titleId: "title-1", likes: 3, dislikes: 2 }]);

    await reconciler.reconcile();

    expect(counters.recomputeReactions).not.toHaveBeenCalled();
  });

  it("publishes what it repaired, per arc", async () => {
    sweep([likeRow("titleId", "title-1", 3)]);

    await reconciler.reconcile();

    expect(redis.set).toHaveBeenCalledWith("reactions:drift:title", 1);
    expect(redis.set).toHaveBeenCalledWith("reactions:drift:comment", 0);
  });

  it("still repairs when the drift cannot be published", async () => {
    sweep([likeRow("titleId", "title-1", 3)]);
    redis.set.mockRejectedValue(new Error("redis is down"));

    await expect(reconciler.reconcile()).resolves.toBeUndefined();
    expect(counters.recomputeReactions).toHaveBeenCalled();
  });
});
