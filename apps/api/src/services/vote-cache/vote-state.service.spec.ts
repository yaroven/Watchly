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

    it("reads a stored no-vote as no vote", async () => {
      redis.get.mockResolvedValue("N");

      await expect(service.get(target, userId)).resolves.toBeNull();
    });

    it("answers undefined for a missing key, without reaching for a row", async () => {
      await expect(service.get(target, userId)).resolves.toBeUndefined();
    });

    it("treats a value it did not write as a miss", async () => {
      redis.get.mockResolvedValue("probably-not-a-vote");

      await expect(service.get(target, userId)).resolves.toBeUndefined();
    });
  });

  describe("set", () => {
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

  describe("forTitles", () => {
    it("asks for the whole page in one call", async () => {
      redis.mget.mockResolvedValue(["L", "N"]);

      const votes = await service.forTitles([{ id: titleId }, { id: "other" }], userId);

      expect(redis.mget).toHaveBeenCalledWith([key, `vote:title:other:${userId}`]);
      expect(votes.get(titleId)).toBe(LIKE);
      expect(votes.get("other")).toBeNull();
    });

    it("keys a comment on its own arc", async () => {
      redis.mget.mockResolvedValue(["L"]);

      await service.forComments([{ id: "c1" }], userId);

      expect(redis.mget).toHaveBeenCalledWith([`vote:comment:c1:${userId}`]);
    });

    it("leaves a pair the cache cannot answer for out of the map", async () => {
      redis.mget.mockResolvedValue([null]);

      const votes = await service.forTitles([{ id: titleId }], userId);

      expect(votes.has(titleId)).toBe(false);
    });

    it("asks nothing for an empty page", async () => {
      await expect(service.forTitles([], userId)).resolves.toEqual(new Map());
      expect(redis.mget).not.toHaveBeenCalled();
    });

    it.each([[null], [undefined]])("asks nothing when the viewer is %p", async (viewerId) => {
      const votes = await service.forTitles([{ id: titleId }], viewerId);

      expect(redis.mget).not.toHaveBeenCalled();
      expect(votes.size).toBe(0);
    });

    it("falls back to an empty answer when redis is unreachable", async () => {
      redis.mget.mockRejectedValue(new Error("redis is down"));

      await expect(service.forTitles([{ id: titleId }], userId)).resolves.toEqual(new Map());
    });
  });
});
