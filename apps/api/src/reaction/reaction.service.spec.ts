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
  let voteState: { set: jest.Mock; read: jest.Mock };
  let flush: { schedule: jest.Mock };
  let calls: string[];

  beforeEach(async () => {
    calls = [];
    prisma = client();
    prisma.title.findUnique.mockResolvedValue({ id: titleId });
    prisma.comment.findUnique.mockResolvedValue({ id: commentId });

    voteState = {
      read: jest.fn().mockResolvedValue(null),
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
    it("records it in the cache, not in a transaction", async () => {
      await service.setVote(titleTarget(titleId), userId, LIKE);

      expect(voteState.set).toHaveBeenCalledWith(titleTarget(titleId), userId, LIKE);
      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
      expect(prisma.reaction.deleteMany).not.toHaveBeenCalled();
    });

    it("writes a withdrawal as the absence of a vote", async () => {
      voteState.set.mockResolvedValue(LIKE);

      await service.clearVote(commentTarget(commentId), userId);

      expect(voteState.set).toHaveBeenCalledWith(commentTarget(commentId), userId, null);
    });

    /**
     * Absolute, so the second identical call is not a withdrawal. The old
     * toggle read the same request as "undo", which is the behaviour this
     * replaced.
     */
    it("holds the vote when the same one is sent again", async () => {
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.setVote(titleTarget(titleId), userId, LIKE)).resolves.toMatchObject({
        myReaction: LIKE,
      });
      expect(voteState.set).toHaveBeenCalledWith(titleTarget(titleId), userId, LIKE);
    });

    /**
     * The order is the safety: a job that fires before the write mirrors the
     * state already in place and does nothing, while a write with no job would
     * sit in the cache, be read as real, and revert a week later.
     */
    it("schedules the flush before writing the vote", async () => {
      await service.setVote(titleTarget(titleId), userId, LIKE);

      expect(calls).toEqual(["schedule", "set"]);
    });

    it("answers with the vote that was asked for", async () => {
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.setVote(titleTarget(titleId), userId, DISLIKE)).resolves.toMatchObject({
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
      voteState.set.mockResolvedValue(null);

      await expect(service.setVote(titleTarget(titleId), userId, LIKE)).resolves.toEqual({
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
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.setVote(titleTarget(titleId), userId, DISLIKE)).resolves.toMatchObject({
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
      voteState.set.mockResolvedValue(LIKE);

      await expect(service.clearVote(titleTarget(titleId), userId)).resolves.toMatchObject({
        likes: 0,
        dislikes: 0,
      });
    });
  });

  describe("when redis is unreachable", () => {
    it("refuses the vote with a 503", async () => {
      flush.schedule.mockRejectedValue(new RedisUnavailableError("schedule a flush", null));

      await expect(service.setVote(titleTarget(titleId), userId, LIKE)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("refuses a withdrawal the same way", async () => {
      voteState.set.mockRejectedValue(new RedisUnavailableError("write a vote", null));

      await expect(service.clearVote(titleTarget(titleId), userId)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    /** Only Redis is a 503. A broken row read is a bug, and must not be dressed up as one. */
    it("lets any other failure through untouched", async () => {
      voteState.set.mockRejectedValue(new Error("the database fell over"));

      await expect(service.setVote(titleTarget(titleId), userId, LIKE)).rejects.toThrow(
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
