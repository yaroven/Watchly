import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionFlushScheduler } from "../reaction-flush/reaction-flush-scheduler.service";
import { RedisUnavailableError } from "../redis/redis.error";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { CachedReactionService } from "./cached-reaction.service";
import { ReactionService } from "./reaction.service";
import { titleTarget } from "./utils/reaction-target.const";

const { LIKE, DISLIKE } = ReactionType;

describe("CachedReactionService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const target = titleTarget(titleId);

  let service: CachedReactionService;
  let direct: { setVote: jest.Mock; clearVote: jest.Mock; assertSubjectExists: jest.Mock };
  let voteState: { set: jest.Mock };
  let flush: { schedule: jest.Mock };
  let prisma: { engagementCounters: { findUnique: jest.Mock } };
  let calls: string[];

  const flushed = (likes: number, dislikes: number, commentCount = 0) =>
    prisma.engagementCounters.findUnique.mockResolvedValue({ likes, dislikes, commentCount });

  beforeEach(async () => {
    calls = [];
    direct = {
      assertSubjectExists: jest.fn().mockResolvedValue(undefined),
      setVote: jest.fn().mockResolvedValue({
        likes: 1,
        dislikes: 0,
        commentCount: 0,
        myReaction: LIKE,
      }),
      clearVote: jest
        .fn()
        .mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0, myReaction: null }),
    };
    voteState = {
      set: jest.fn().mockImplementation(() => {
        calls.push("set");
        return Promise.resolve(null);
      }),
    };
    flush = {
      schedule: jest.fn().mockImplementation(() => {
        calls.push("schedule");
        return Promise.resolve();
      }),
    };
    prisma = { engagementCounters: { findUnique: jest.fn().mockResolvedValue(null) } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CachedReactionService,
        EngagementCountersService,
        { provide: ReactionService, useValue: direct },
        { provide: VoteStateService, useValue: voteState },
        { provide: ReactionFlushScheduler, useValue: flush },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CachedReactionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("the cached path", () => {
    it("records the vote in the cache instead of writing the row", async () => {
      await service.setVote(target, userId, LIKE);

      expect(voteState.set).toHaveBeenCalledWith(target, userId, LIKE);
      expect(direct.setVote).not.toHaveBeenCalled();
    });

    it("writes a withdrawal as the absence of a vote", async () => {
      await service.clearVote(target, userId);

      expect(voteState.set).toHaveBeenCalledWith(target, userId, null);
      expect(direct.clearVote).not.toHaveBeenCalled();
    });

    /**
     * The order is the safety: a job that fires before the write mirrors the
     * state already in place and does nothing, while a write with no job would
     * sit in the cache, be read as real, and revert a week later.
     */
    it("schedules the flush before writing the vote", async () => {
      await service.setVote(target, userId, LIKE);

      expect(calls).toEqual(["schedule", "set"]);
    });

    it("delegates the existence check rather than reimplementing it", async () => {
      await service.assertSubjectExists(target);

      expect(direct.assertSubjectExists).toHaveBeenCalledWith(target);
    });
  });

  describe("the counts in the response", () => {
    it("adds this call's own change to the last flushed counts", async () => {
      flushed(10, 4, 7);

      await expect(service.setVote(target, userId, LIKE)).resolves.toEqual({
        likes: 11,
        dislikes: 4,
        commentCount: 7,
        myReaction: LIKE,
      });
    });

    it("moves both counters when the vote changes sides", async () => {
      flushed(10, 4);
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.setVote(target, userId, DISLIKE)).resolves.toMatchObject({
        likes: 9,
        dislikes: 5,
      });
    });

    /** The same vote again moves nothing, which is what absolute means. */
    it("leaves the counts alone when the vote does not change", async () => {
      flushed(10, 4);
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.setVote(target, userId, LIKE)).resolves.toMatchObject({
        likes: 10,
        dislikes: 4,
      });
    });

    /** The two numbers come from different moments, so the subtraction can underflow. */
    it("never answers a negative count", async () => {
      flushed(0, 0);
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.clearVote(target, userId)).resolves.toMatchObject({
        likes: 0,
        dislikes: 0,
      });
    });
  });

  describe("when redis is unreachable", () => {
    const down = new RedisUnavailableError("write a vote", null);

    it("writes the vote straight to Postgres instead of refusing it", async () => {
      voteState.set.mockRejectedValue(down);

      await expect(service.setVote(target, userId, LIKE)).resolves.toMatchObject({
        myReaction: LIKE,
      });
      expect(direct.setVote).toHaveBeenCalledWith(target, userId, LIKE);
    });

    it("falls back for a withdrawal too", async () => {
      voteState.set.mockRejectedValue(down);

      await service.clearVote(target, userId);

      expect(direct.clearVote).toHaveBeenCalledWith(target, userId);
    });

    it("falls back when the queue is what cannot be reached", async () => {
      flush.schedule.mockRejectedValue(new RedisUnavailableError("schedule a flush", null));

      await service.setVote(target, userId, LIKE);

      expect(direct.setVote).toHaveBeenCalled();
      expect(voteState.set).not.toHaveBeenCalled();
    });

    /**
     * Leaving the key absent is what makes the fallback safe: absent means
     * "unknown", so the next read goes to the row this just wrote. Writing a
     * guess into the cache is what would make the two disagree.
     */
    it("does not guess at the cache on the way out", async () => {
      voteState.set.mockRejectedValue(down);

      await service.setVote(target, userId, LIKE);

      expect(voteState.set).toHaveBeenCalledTimes(1);
    });

    it("answers with the exact counts the fallback recounted", async () => {
      voteState.set.mockRejectedValue(down);
      direct.setVote.mockResolvedValue({
        likes: 42,
        dislikes: 1,
        commentCount: 0,
        myReaction: LIKE,
      });

      await expect(service.setVote(target, userId, LIKE)).resolves.toMatchObject({ likes: 42 });
      expect(prisma.engagementCounters.findUnique).not.toHaveBeenCalled();
    });

    /** Only Redis falls back. A broken row read is a bug, and must not be dressed up. */
    it("lets any other failure through untouched", async () => {
      voteState.set.mockRejectedValue(new Error("the database fell over"));

      await expect(service.setVote(target, userId, LIKE)).rejects.toThrow("the database fell over");
      expect(direct.setVote).not.toHaveBeenCalled();
    });
  });
});
