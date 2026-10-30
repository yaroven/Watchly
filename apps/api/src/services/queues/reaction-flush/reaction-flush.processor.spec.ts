import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { Job } from "bullmq";
import { EngagementCountersService } from "../../engagement/engagement-counters.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ReactionArc } from "../../reaction/enums/reaction-arc.enum";
import { ReactionService } from "../../reaction/reaction.service";
import { VoteStateService } from "../../vote-cache/vote-state.service";
import {
  REACTION_FLUSH_JOB_NAME,
  REACTION_RECOUNT_JOB_NAME,
  ReactionFlushQueueJob,
} from "./reaction-flush-queue.options";
import { ReactionFlushScheduler } from "./reaction-flush-scheduler.service";
import { ReactionFlushProcessor } from "./reaction-flush.processor";

const { LIKE } = ReactionType;

describe("ReactionFlushProcessor", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  const flushJob = (arc: ReactionArc, subjectId: string) =>
    ({
      name: REACTION_FLUSH_JOB_NAME,
      data: { arc, subjectId, userId },
    }) as Job<ReactionFlushQueueJob>;
  const recountJob = (arc: ReactionArc, subjectId: string) =>
    ({ name: REACTION_RECOUNT_JOB_NAME, data: { arc, subjectId } }) as Job<ReactionFlushQueueJob>;

  let processor: ReactionFlushProcessor;
  let prisma: { reaction: { findUnique: jest.Mock } };
  let voteState: { get: jest.Mock };
  let reactions: { writeVote: jest.Mock };
  let counters: { recomputeReactions: jest.Mock };
  let scheduler: { scheduleRecount: jest.Mock };
  let calls: string[];

  beforeEach(async () => {
    calls = [];
    prisma = { reaction: { findUnique: jest.fn().mockResolvedValue(null) } };
    voteState = { get: jest.fn().mockResolvedValue(LIKE) };
    reactions = {
      writeVote: jest.fn().mockImplementation(() => {
        calls.push("write");
        return Promise.resolve();
      }),
    };
    counters = { recomputeReactions: jest.fn().mockResolvedValue(undefined) };
    scheduler = {
      scheduleRecount: jest.fn().mockImplementation(() => {
        calls.push("recount");
        return Promise.resolve();
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionFlushProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: VoteStateService, useValue: voteState },
        { provide: ReactionService, useValue: reactions },
        { provide: EngagementCountersService, useValue: counters },
        { provide: ReactionFlushScheduler, useValue: scheduler },
      ],
    }).compile();

    processor = moduleRef.get(ReactionFlushProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  describe("a flush", () => {
    it("mirrors what the cache holds now", async () => {
      await processor.process(flushJob(ReactionArc.TITLE, titleId));

      expect(voteState.get).toHaveBeenCalledWith({ titleId }, userId);
      expect(reactions.writeVote).toHaveBeenCalledWith(prisma, { titleId }, userId, LIKE);
    });

    it("rebuilds the comment arc from the job", async () => {
      voteState.get.mockResolvedValue(null);

      await processor.process(flushJob(ReactionArc.COMMENT, commentId));

      expect(reactions.writeVote).toHaveBeenCalledWith(prisma, { commentId }, userId, null);
    });

    it("mirrors the row when the cache has no answer", async () => {
      voteState.get.mockResolvedValue(undefined);
      prisma.reaction.findUnique.mockResolvedValue({ type: LIKE });

      await processor.process(flushJob(ReactionArc.TITLE, titleId));

      expect(prisma.reaction.findUnique).toHaveBeenCalledWith({
        where: { titleId_userId: { titleId, userId } },
        select: { type: true },
      });
      expect(reactions.writeVote).toHaveBeenCalledWith(prisma, { titleId }, userId, LIKE);
    });

    it("does not read a row when the cache answered", async () => {
      await processor.process(flushJob(ReactionArc.TITLE, titleId));

      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

    it("leaves the counters to the subject's recount", async () => {
      await processor.process(flushJob(ReactionArc.TITLE, titleId));

      expect(counters.recomputeReactions).not.toHaveBeenCalled();
      expect(scheduler.scheduleRecount).toHaveBeenCalledWith({ titleId });
    });

    it("asks for the recount only once the row is written", async () => {
      await processor.process(flushJob(ReactionArc.TITLE, titleId));

      expect(calls).toEqual(["write", "recount"]);
    });

    it("asks for no recount when the row could not be written", async () => {
      reactions.writeVote.mockRejectedValue(new Error("postgres said no"));

      await expect(processor.process(flushJob(ReactionArc.TITLE, titleId))).rejects.toThrow(
        "postgres said no",
      );
      expect(scheduler.scheduleRecount).not.toHaveBeenCalled();
    });
  });

  describe("a recount", () => {
    it("recounts the subject from its rows", async () => {
      await processor.process(recountJob(ReactionArc.COMMENT, commentId));

      expect(counters.recomputeReactions).toHaveBeenCalledWith({ commentId }, prisma);
    });

    it("touches neither the cache nor any vote", async () => {
      await processor.process(recountJob(ReactionArc.TITLE, titleId));

      expect(voteState.get).not.toHaveBeenCalled();
      expect(reactions.writeVote).not.toHaveBeenCalled();
      expect(scheduler.scheduleRecount).not.toHaveBeenCalled();
    });

    it("rethrows so the job retries", async () => {
      counters.recomputeReactions.mockRejectedValue(new Error("postgres said no"));

      await expect(processor.process(recountJob(ReactionArc.TITLE, titleId))).rejects.toThrow(
        "postgres said no",
      );
    });
  });
});
