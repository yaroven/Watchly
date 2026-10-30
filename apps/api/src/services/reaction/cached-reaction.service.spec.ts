import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionFlushScheduler } from "../queues/reaction-flush/reaction-flush-scheduler.service";
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
  let direct: { setVote: jest.Mock; clearVote: jest.Mock };
  let voteState: { set: jest.Mock };
  let flush: { schedule: jest.Mock };
  let prisma: {
    title: { findUnique: jest.Mock };
    reaction: { findUnique: jest.Mock };
  };
  let calls: string[];

  const flushed = (likes: number, dislikes: number, commentCount = 0) =>
    prisma.title.findUnique.mockResolvedValue({ counters: { likes, dislikes, commentCount } });

  beforeEach(async () => {
    calls = [];
    direct = {
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
        return Promise.resolve(undefined);
      }),
    };
    flush = {
      schedule: jest.fn().mockImplementation(() => {
        calls.push("schedule");
        return Promise.resolve();
      }),
    };
    prisma = {
      title: { findUnique: jest.fn().mockResolvedValue({ counters: null }) },
      reaction: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CachedReactionService,
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

    it("schedules the flush before writing the vote", async () => {
      await service.setVote(target, userId, LIKE);

      expect(calls).toEqual(["schedule", "set"]);
    });

    it("refuses a subject that is gone before touching the cache", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await expect(service.setVote(target, userId, LIKE)).rejects.toThrow(NotFoundException);
      expect(flush.schedule).not.toHaveBeenCalled();
      expect(voteState.set).not.toHaveBeenCalled();
      expect(direct.setVote).not.toHaveBeenCalled();
    });

    it("finds the subject and its counters in one query", async () => {
      flushed(10, 4);

      await service.setVote(target, userId, LIKE);

      expect(prisma.title.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.title.findUnique).toHaveBeenCalledWith({
        where: { id: titleId },
        select: { counters: { select: { likes: true, dislikes: true, commentCount: true } } },
      });
    });

    it("answers zero counts for a subject nobody has reacted to", async () => {
      await expect(service.setVote(target, userId, LIKE)).resolves.toEqual({
        likes: 1,
        dislikes: 0,
        commentCount: 0,
        myReaction: LIKE,
      });
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

    it("leaves the counts alone when the vote does not change", async () => {
      flushed(10, 4);
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.setVote(target, userId, LIKE)).resolves.toMatchObject({
        likes: 10,
        dislikes: 4,
      });
    });

    it("reads the row for the previous vote when the cache displaced nothing", async () => {
      flushed(10, 4);
      voteState.set.mockResolvedValue(undefined);
      prisma.reaction.findUnique.mockResolvedValue({ type: LIKE });

      await expect(service.setVote(target, userId, DISLIKE)).resolves.toMatchObject({
        likes: 9,
        dislikes: 5,
      });
    });

    it("does not read a row when the cache displaced something", async () => {
      flushed(10, 4);
      voteState.set.mockResolvedValue(LIKE);

      await service.setVote(target, userId, DISLIKE);

      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

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
    });

    it("lets any other failure through untouched", async () => {
      voteState.set.mockRejectedValue(new Error("the database fell over"));

      await expect(service.setVote(target, userId, LIKE)).rejects.toThrow("the database fell over");
      expect(direct.setVote).not.toHaveBeenCalled();
    });
  });
});
