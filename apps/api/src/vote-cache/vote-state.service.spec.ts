import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { titleTarget } from "../reaction/utils/reaction-target.const";
import { RedisService } from "../redis/redis.service";
import { VOTE_TTL_SECONDS } from "./vote-cache.const";
import { VoteStateService } from "./vote-state.service";

const { LIKE, DISLIKE } = ReactionType;

describe("VoteStateService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const target = titleTarget(titleId);
  const key = `vote:title:${titleId}:${userId}`;

  let service: VoteStateService;
  let redis: { get: jest.Mock; set: jest.Mock; mget: jest.Mock };

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(null),
      mget: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [VoteStateService, { provide: RedisService, useValue: redis }],
    }).compile();

    service = moduleRef.get(VoteStateService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("get", () => {
    it("answers with the vote the cache holds", async () => {
      redis.get.mockResolvedValue("L");

      await expect(service.get(target, userId)).resolves.toBe(LIKE);
    });

    /** `N` is a stored answer, and it has to be distinguishable from a miss. */
    it("reads a stored no-vote as no vote", async () => {
      redis.get.mockResolvedValue("N");

      await expect(service.get(target, userId)).resolves.toBeNull();
    });

    /**
     * The cache says it does not know and stops there. Covering for the miss
     * by reading a row is the caller's business, because the three callers want
     * three different things from not knowing.
     */
    it("answers undefined for a missing key, without reaching for a row", async () => {
      await expect(service.get(target, userId)).resolves.toBeUndefined();
    });

    it("treats a value it did not write as a miss", async () => {
      redis.get.mockResolvedValue("probably-not-a-vote");

      await expect(service.get(target, userId)).resolves.toBeUndefined();
    });
  });

  describe("set", () => {
    /**
     * The point of an absolute write: the value stored owes nothing to the
     * value read, so two clicks cannot race over a decision neither makes.
     */
    it("writes the vote it was given whatever was there before", async () => {
      redis.set.mockResolvedValue("D");

      await service.set(target, userId, LIKE);

      expect(redis.set).toHaveBeenCalledWith(key, "L", "EX", VOTE_TTL_SECONDS, "GET");
    });

    it("stores a withdrawal as the tombstone, not as a deletion", async () => {
      await service.set(target, userId, null);

      expect(redis.set).toHaveBeenCalledWith(key, "N", "EX", VOTE_TTL_SECONDS, "GET");
    });

    it("answers with the vote it displaced", async () => {
      redis.set.mockResolvedValue("L");

      await expect(service.set(target, userId, DISLIKE)).resolves.toBe(LIKE);
    });

    it("reads a displaced tombstone as no previous vote", async () => {
      redis.set.mockResolvedValue("N");

      await expect(service.set(target, userId, null)).resolves.toBeNull();
    });

    it("answers undefined when there was nothing to displace", async () => {
      redis.set.mockResolvedValue(null);

      await expect(service.set(target, userId, LIKE)).resolves.toBeUndefined();
    });
  });

  describe("readMany", () => {
    it("asks for the whole page in one call", async () => {
      redis.mget.mockResolvedValue(["L", "N"]);

      const votes = await service.readMany([target, titleTarget("other")], userId);

      expect(redis.mget).toHaveBeenCalledWith([key, `vote:title:other:${userId}`]);
      expect(votes.get(titleId)).toBe(LIKE);
      expect(votes.get("other")).toBeNull();
    });

    /**
     * A miss is left out rather than stored as null, so `Map.get` yields
     * undefined for it and the caller falls back to the row it already loaded.
     */
    it("leaves a pair the cache cannot answer for out of the map", async () => {
      redis.mget.mockResolvedValue([null]);

      const votes = await service.readMany([target], userId);

      expect(votes.has(titleId)).toBe(false);
    });

    it("asks nothing for an empty page", async () => {
      await expect(service.readMany([], userId)).resolves.toEqual(new Map());
      expect(redis.mget).not.toHaveBeenCalled();
    });

    /** Reads degrade; only writes are allowed to notice Redis is gone. */
    it("falls back to an empty answer when redis is unreachable", async () => {
      redis.mget.mockRejectedValue(new Error("redis is down"));

      await expect(service.readMany([target], userId)).resolves.toEqual(new Map());
    });
  });
});
