import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ReactionService } from "../reaction/reaction.service";
import { VoteStateService } from "../reaction/vote-state.service";
import { FlushVoteJob } from "./reaction-flush-queue.options";
import { ReactionFlushProcessor } from "./reaction-flush.processor";

const { LIKE } = ReactionType;

describe("ReactionFlushProcessor", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  const job = (data: FlushVoteJob) => ({ data }) as Job<FlushVoteJob>;

  let processor: ReactionFlushProcessor;
  let prisma: { $transaction: jest.Mock };
  let tx: object;
  let voteState: { read: jest.Mock };
  let reactions: { applyAbsolute: jest.Mock };

  beforeEach(async () => {
    tx = { marker: "the transaction client" };
    prisma = { $transaction: jest.fn((fn: (c: unknown) => unknown) => fn(tx)) };
    voteState = { read: jest.fn().mockResolvedValue(LIKE) };
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

    expect(voteState.read).toHaveBeenCalledWith({ titleId }, userId);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(reactions.applyAbsolute).toHaveBeenCalledWith(tx, { titleId }, userId, LIKE);
  });

  it("rebuilds the comment arc from the job", async () => {
    voteState.read.mockResolvedValue(null);

    await processor.process(job({ arc: "comment", subjectId: commentId, userId }));

    expect(reactions.applyAbsolute).toHaveBeenCalledWith(tx, { commentId }, userId, null);
  });

  /** Swallowing here would lose the vote and leave the queue's counts looking clean. */
  it("rethrows so the job retries", async () => {
    reactions.applyAbsolute.mockRejectedValue(new Error("postgres said no"));

    await expect(
      processor.process(job({ arc: "title", subjectId: titleId, userId })),
    ).rejects.toThrow("postgres said no");
  });
});
