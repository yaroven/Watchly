import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { titleTarget } from "./utils/reaction-target.const";
import { VOTE_TTL_SECONDS } from "./utils/vote-cache.const";
import { VoteStateService } from "./vote-state.service";

const { LIKE, DISLIKE } = ReactionType;

describe("VoteStateService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const target = titleTarget(titleId);
  const key = `vote:title:${titleId}:${userId}`;

  let service: VoteStateService;
  let redis: { get: jest.Mock; set: jest.Mock };
  let prisma: { reaction: { findUnique: jest.Mock } };

  beforeEach(async () => {
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue("OK") };
    prisma = { reaction: { findUnique: jest.fn().mockResolvedValue(null) } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VoteStateService,
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(VoteStateService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("read", () => {
    it("answers from the cache without touching the row", async () => {
      redis.get.mockResolvedValue("L");

      await expect(service.read(target, userId)).resolves.toBe(LIKE);
      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

    /** `N` is the stored answer, and it has to win over a read of the row. */
    it("reads a stored no-vote as no vote, not as a miss", async () => {
      redis.get.mockResolvedValue("N");

      await expect(service.read(target, userId)).resolves.toBeNull();
      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

    it("reads the row on a miss and caches what it found", async () => {
      prisma.reaction.findUnique.mockResolvedValue({ type: DISLIKE });

      await expect(service.read(target, userId)).resolves.toBe(DISLIKE);
      expect(prisma.reaction.findUnique).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        select: { type: true },
      });
      expect(redis.set).toHaveBeenCalledWith(key, "D", "EX", VOTE_TTL_SECONDS);
    });

    /**
     * The expensive half of the miss is the query, so a viewer who holds no
     * vote has to be cached too — otherwise every anonymous-looking pair pays
     * for a lookup on every click.
     */
    it("caches the absence of a row", async () => {
      await expect(service.read(target, userId)).resolves.toBeNull();
      expect(redis.set).toHaveBeenCalledWith(key, "N", "EX", VOTE_TTL_SECONDS);
    });

    it("treats a value it did not write as a miss", async () => {
      redis.get.mockResolvedValue("probably-not-a-vote");
      prisma.reaction.findUnique.mockResolvedValue({ type: LIKE });

      await expect(service.read(target, userId)).resolves.toBe(LIKE);
      expect(prisma.reaction.findUnique).toHaveBeenCalled();
    });
  });

  describe("transition", () => {
    it("sets the vote the viewer does not hold", async () => {
      redis.get.mockResolvedValue("N");

      await expect(service.transition(target, userId, LIKE)).resolves.toEqual({
        previous: null,
        next: LIKE,
      });
      expect(redis.set).toHaveBeenCalledWith(key, "L", "EX", VOTE_TTL_SECONDS);
    });

    it("withdraws the vote the viewer already holds", async () => {
      redis.get.mockResolvedValue("L");

      await expect(service.transition(target, userId, LIKE)).resolves.toEqual({
        previous: LIKE,
        next: null,
      });
      expect(redis.set).toHaveBeenCalledWith(key, "N", "EX", VOTE_TTL_SECONDS);
    });

    it("switches sides", async () => {
      redis.get.mockResolvedValue("L");

      await expect(service.transition(target, userId, DISLIKE)).resolves.toEqual({
        previous: LIKE,
        next: DISLIKE,
      });
    });

    /** A withdrawal is not a toggle: it ends in no vote whatever was held. */
    it("withdraws on a null request regardless of what was held", async () => {
      redis.get.mockResolvedValue("D");

      await expect(service.transition(target, userId, null)).resolves.toEqual({
        previous: DISLIKE,
        next: null,
      });
      expect(redis.set).toHaveBeenCalledWith(key, "N", "EX", VOTE_TTL_SECONDS);
    });

    /**
     * The bug this cache exists to avoid. A cold Redis that answered "no vote"
     * would re-cast the like the viewer came to withdraw, and the flush would
     * then mirror that back over a row that already said LIKE — a click that
     * answers 200 and changes nothing.
     */
    it("withdraws against a cold cache by reading the row first", async () => {
      redis.get.mockResolvedValue(null);
      prisma.reaction.findUnique.mockResolvedValue({ type: LIKE });

      await expect(service.transition(target, userId, LIKE)).resolves.toEqual({
        previous: LIKE,
        next: null,
      });
    });
  });
});
