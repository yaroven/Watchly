import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { EngagementCountersService } from "../engagement/engagement-counters.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionFlushScheduler } from "../reaction-flush/reaction-flush-scheduler.service";
import { RedisUnavailableError } from "../redis/redis.error";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { ReactionService } from "./reaction.service";
import { commentTarget, titleTarget } from "./utils/reaction-target.const";

const { LIKE, DISLIKE } = ReactionType;

/** A Prisma client's delegates. Never shared with a transaction's — see CLAUDE.md. */
const client = () => ({
  reaction: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  engagementCounters: {
    upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
    findUnique: jest.fn().mockResolvedValue(null),
  },
  title: { findUnique: jest.fn() },
  comment: { findUnique: jest.fn(), count: jest.fn() },
});

describe("ReactionService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  let service: ReactionService;
  let prisma: ReturnType<typeof client>;
  let voteState: { transition: jest.Mock; read: jest.Mock };
  let flush: { schedule: jest.Mock };
  let calls: string[];

  beforeEach(async () => {
    calls = [];
    prisma = client();
    prisma.title.findUnique.mockResolvedValue({ id: titleId });
    prisma.comment.findUnique.mockResolvedValue({ id: commentId });

    voteState = {
      read: jest.fn().mockResolvedValue(null),
      transition: jest.fn().mockImplementation(() => {
        calls.push("transition");
        return Promise.resolve({ previous: null, next: LIKE });
      }),
    };
    flush = {
      schedule: jest.fn().mockImplementation(() => {
        calls.push("schedule");
        return Promise.resolve();
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionService,
        EngagementCountersService,
        { provide: PrismaService, useValue: prisma },
        { provide: VoteStateService, useValue: voteState },
        { provide: ReactionFlushScheduler, useValue: flush },
      ],
    }).compile();

    service = moduleRef.get(ReactionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("casting a vote", () => {
    it("decides the toggle in the cache, not in a transaction", async () => {
      await service.vote(titleTarget(titleId), userId, LIKE);

      expect(voteState.transition).toHaveBeenCalledWith(titleTarget(titleId), userId, LIKE);
      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
      expect(prisma.reaction.deleteMany).not.toHaveBeenCalled();
    });

    it("asks for a withdrawal with no vote to toggle against", async () => {
      voteState.transition.mockResolvedValue({ previous: LIKE, next: null });

      await service.unvote(commentTarget(commentId), userId);

      expect(voteState.transition).toHaveBeenCalledWith(commentTarget(commentId), userId, null);
    });

    /**
     * The order is the safety: a job that fires before the write mirrors the
     * state already in place and does nothing, while a write with no job would
     * sit in the cache, be read as real, and revert a week later.
     */
    it("schedules the flush before writing the vote", async () => {
      await service.vote(titleTarget(titleId), userId, LIKE);

      expect(calls).toEqual(["schedule", "transition"]);
    });

    it("answers with the vote the toggle landed on", async () => {
      voteState.transition.mockResolvedValue({ previous: LIKE, next: DISLIKE });

      await expect(service.vote(titleTarget(titleId), userId, DISLIKE)).resolves.toMatchObject({
        myReaction: DISLIKE,
      });
    });
  });

  describe("the counts in the response", () => {
    it("adds this call's own change to the last flushed counts", async () => {
      prisma.engagementCounters.findUnique.mockResolvedValue({
        likes: 10,
        dislikes: 4,
        commentCount: 7,
      });
      voteState.transition.mockResolvedValue({ previous: null, next: LIKE });

      await expect(service.vote(titleTarget(titleId), userId, LIKE)).resolves.toEqual({
        likes: 11,
        dislikes: 4,
        commentCount: 7,
        myReaction: LIKE,
      });
    });

    it("moves both counters when the vote switches sides", async () => {
      prisma.engagementCounters.findUnique.mockResolvedValue({
        likes: 10,
        dislikes: 4,
        commentCount: 0,
      });
      voteState.transition.mockResolvedValue({ previous: LIKE, next: DISLIKE });

      await expect(service.vote(titleTarget(titleId), userId, DISLIKE)).resolves.toMatchObject({
        likes: 9,
        dislikes: 5,
      });
    });

    /** The two numbers come from different moments, so the subtraction can underflow. */
    it("never answers a negative count", async () => {
      prisma.engagementCounters.findUnique.mockResolvedValue({
        likes: 0,
        dislikes: 0,
        commentCount: 0,
      });
      voteState.transition.mockResolvedValue({ previous: LIKE, next: null });

      await expect(service.unvote(titleTarget(titleId), userId)).resolves.toMatchObject({
        likes: 0,
        dislikes: 0,
      });
    });
  });

  describe("when redis is unreachable", () => {
    it("refuses the vote with a 503", async () => {
      flush.schedule.mockRejectedValue(new RedisUnavailableError("schedule a flush", null));

      await expect(service.vote(titleTarget(titleId), userId, LIKE)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("refuses a withdrawal the same way", async () => {
      voteState.transition.mockRejectedValue(new RedisUnavailableError("write a vote", null));

      await expect(service.unvote(titleTarget(titleId), userId)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    /** Only Redis is a 503. A broken row read is a bug, and must not be dressed up as one. */
    it("lets any other failure through untouched", async () => {
      voteState.transition.mockRejectedValue(new Error("the database fell over"));

      await expect(service.vote(titleTarget(titleId), userId, LIKE)).rejects.toThrow(
        "the database fell over",
      );
    });
  });

  describe("applyAbsolute", () => {
    let tx: ReturnType<typeof client>;

    beforeEach(() => {
      tx = client();
    });

    it("writes the vote the pair holds", async () => {
      await service.applyAbsolute(tx as never, titleTarget(titleId), userId, DISLIKE);

      expect(tx.reaction.upsert).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type: DISLIKE },
        update: { type: DISLIKE },
      });
    });

    it("removes the row when the pair holds nothing", async () => {
      await service.applyAbsolute(tx as never, titleTarget(titleId), userId, null);

      expect(tx.reaction.deleteMany).toHaveBeenCalledWith({ where: { titleId, userId } });
      expect(tx.reaction.upsert).not.toHaveBeenCalled();
    });

    /** Applying the same state twice has to land the same rows. */
    it("is idempotent", async () => {
      await service.applyAbsolute(tx as never, titleTarget(titleId), userId, LIKE);
      await service.applyAbsolute(tx as never, titleTarget(titleId), userId, LIKE);

      expect(tx.reaction.upsert).toHaveBeenNthCalledWith(2, {
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, type: LIKE },
        update: { type: LIKE },
      });
    });

    it("recomputes the counters on the client it was given", async () => {
      await service.applyAbsolute(tx as never, commentTarget(commentId), userId, LIKE);

      expect(tx.reaction.groupBy).toHaveBeenCalledWith({
        by: ["type"],
        where: { commentId },
        _count: { _all: true },
      });
      expect(prisma.reaction.groupBy).not.toHaveBeenCalled();
    });
  });

  describe("assertSubjectExists", () => {
    it("rejects a title that is gone", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(titleTarget(titleId))).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects a comment that is gone", async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.assertSubjectExists(commentTarget(commentId))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
