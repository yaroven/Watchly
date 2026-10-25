import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionService } from "../reaction/reaction.service";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { FlushVoteJob } from "./reaction-flush-queue.options";
import { ReactionFlushProcessor } from "./reaction-flush.processor";

const { LIKE } = ReactionType;

describe("ReactionFlushProcessor", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  const job = (data: FlushVoteJob) => ({ data }) as Job<FlushVoteJob>;

  let processor: ReactionFlushProcessor;
  let prisma: { $transaction: jest.Mock; reaction: { findUnique: jest.Mock } };
  let tx: object;
  let voteState: { get: jest.Mock };
  let reactions: { applyAbsolute: jest.Mock };

  beforeEach(async () => {
    tx = { marker: "the transaction client" };
    prisma = {
      $transaction: jest.fn((fn: (c: unknown) => unknown) => fn(tx)),
      reaction: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    voteState = { get: jest.fn().mockResolvedValue(LIKE) };
    reactions = { applyAbsolute: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionFlushProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: VoteStateService, useValue: voteState },
        { provide: ReactionService, useValue: reactions },
      ],
    }).compile();

    processor = moduleRef.get(ReactionFlushProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  /**
   * The state is read here rather than carried in the job, which is the whole
   * reason two jobs for one pair can be worked in any order.
   */
  it("mirrors what the cache holds now, on the transaction's client", async () => {
    await processor.process(job({ arc: "title", subjectId: titleId, userId }));

    expect(voteState.get).toHaveBeenCalledWith({ titleId }, userId);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(reactions.applyAbsolute).toHaveBeenCalledWith(tx, { titleId }, userId, LIKE);
  });

  it("rebuilds the comment arc from the job", async () => {
    voteState.get.mockResolvedValue(null);

    await processor.process(job({ arc: "comment", subjectId: commentId, userId }));

    expect(reactions.applyAbsolute).toHaveBeenCalledWith(tx, { commentId }, userId, null);
  });

  /**
   * The cache not knowing is not the same as the pair holding nothing. The row
   * is already the answer in that case, so mirroring it onto itself costs a
   * transaction and changes no rows — reading the cache as "no vote" would
   * instead delete a vote nobody withdrew.
   */
  it("mirrors the row when the cache has no answer", async () => {
    voteState.get.mockResolvedValue(undefined);
    prisma.reaction.findUnique.mockResolvedValue({ type: LIKE });

    await processor.process(job({ arc: "title", subjectId: titleId, userId }));

    expect(prisma.reaction.findUnique).toHaveBeenCalledWith({
      where: { titleId_userId: { titleId, userId } },
      select: { type: true },
    });
    expect(reactions.applyAbsolute).toHaveBeenCalledWith(tx, { titleId }, userId, LIKE);
  });

  it("does not read a row when the cache answered", async () => {
    await processor.process(job({ arc: "title", subjectId: titleId, userId }));

    expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
  });

  /** Swallowing here would lose the vote and leave the queue's counts looking clean. */
  it("rethrows so the job retries", async () => {
    reactions.applyAbsolute.mockRejectedValue(new Error("postgres said no"));

    await expect(
      processor.process(job({ arc: "title", subjectId: titleId, userId })),
    ).rejects.toThrow("postgres said no");
  });
});
