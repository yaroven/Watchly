import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
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
  let redis: { get: jest.Mock; set: jest.Mock };
  let prisma: { reaction: { findUnique: jest.Mock } };

  beforeEach(async () => {
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(null) };
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

  describe("set", () => {
    /**
     * The point of an absolute write: the value stored owes nothing to the
     * value read, so two clicks cannot race over a decision neither of them
     * makes.
     */
    it("writes the vote it was given whatever was there before", async () => {
      redis.set.mockResolvedValue("D");

      await service.set(target, userId, LIKE);

      expect(redis.set).toHaveBeenCalledWith(key, "L", "EX", VOTE_TTL_SECONDS, "GET");
    });

    it("stores a withdrawal as the tombstone, not as a deletion", async () => {
      redis.set.mockResolvedValue("L");

      await service.set(target, userId, null);

      expect(redis.set).toHaveBeenCalledWith(key, "N", "EX", VOTE_TTL_SECONDS, "GET");
    });

    it("answers with the vote that was displaced", async () => {
      redis.set.mockResolvedValue("L");

      await expect(service.set(target, userId, DISLIKE)).resolves.toBe(LIKE);
    });

    it("reads a displaced tombstone as no previous vote", async () => {
      redis.set.mockResolvedValue("N");

      await expect(service.set(target, userId, LIKE)).resolves.toBeNull();
      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

    /**
     * `SET … GET` on a key that held nothing cannot say what came before it,
     * and by then the key holds the new value — so the row is the only place
     * left that knows. It is wanted for the counts in the response, which is
     * why getting it wrong is cosmetic now rather than a lost vote.
     */
    it("falls back to the row when the cache had nothing to displace", async () => {
      redis.set.mockResolvedValue(null);
      prisma.reaction.findUnique.mockResolvedValue({ type: DISLIKE });

      await expect(service.set(target, userId, LIKE)).resolves.toBe(DISLIKE);
      expect(prisma.reaction.findUnique).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        select: { type: true },
      });
    });

    it("does not write the row's value back over the vote it just stored", async () => {
      redis.set.mockResolvedValue(null);
      prisma.reaction.findUnique.mockResolvedValue({ type: DISLIKE });

      await service.set(target, userId, LIKE);

      expect(redis.set).toHaveBeenCalledTimes(1);
    });
  });
});
