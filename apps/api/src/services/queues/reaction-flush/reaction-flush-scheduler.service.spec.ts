import { getQueueToken } from "@nestjs/bullmq";
import { Test } from "@nestjs/testing";
import { ReactionArc } from "../../reaction/enums/reaction-arc.enum";
import { commentTarget, titleTarget } from "../../reaction/utils/reaction-target.const";
import { RedisUnavailableError } from "../../redis/redis.error";
import { REACTION_FLUSH_JOB_NAME, REACTION_FLUSH_QUEUE_NAME } from "./reaction-flush-queue.options";
import { ReactionFlushScheduler } from "./reaction-flush-scheduler.service";

describe("ReactionFlushScheduler", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  let scheduler: ReactionFlushScheduler;
  let queue: { add: jest.Mock };

  const optionsOf = () => (queue.add.mock.calls[0] as [string, unknown, Record<string, any>])[2];

  beforeEach(async () => {
    queue = { add: jest.fn().mockResolvedValue({ id: "1" }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionFlushScheduler,
        { provide: getQueueToken(REACTION_FLUSH_QUEUE_NAME), useValue: queue },
      ],
    }).compile();

    scheduler = moduleRef.get(ReactionFlushScheduler);
  });

  afterEach(() => jest.clearAllMocks());

  it("points at the pair and says nothing about the vote", async () => {
    await scheduler.schedule(titleTarget(titleId), userId);

    expect(queue.add).toHaveBeenCalledWith(
      REACTION_FLUSH_JOB_NAME,
      { arc: ReactionArc.TITLE, subjectId: titleId, userId },
      expect.anything(),
    );
  });

  it("names the comment arc on the other side", async () => {
    await scheduler.schedule(commentTarget(commentId), userId);

    expect(queue.add).toHaveBeenCalledWith(
      REACTION_FLUSH_JOB_NAME,
      { arc: ReactionArc.COMMENT, subjectId: commentId, userId },
      expect.anything(),
    );
  });

  it("deduplicates on the pair", async () => {
    await scheduler.schedule(titleTarget(titleId), userId);

    expect(optionsOf().deduplication.id).toBe(`vote-title-${titleId}-${userId}`);
  });

  it("keeps a vote that arrives while the flush is running", async () => {
    await scheduler.schedule(titleTarget(titleId), userId);

    expect(optionsOf().deduplication.keepLastIfActive).toBe(true);
  });

  it("sets no jobId of its own", async () => {
    await scheduler.schedule(titleTarget(titleId), userId);

    expect(optionsOf()).not.toHaveProperty("jobId");
  });

  it("names a failure as ours so the caller can fall back", async () => {
    queue.add.mockRejectedValue(new Error("Stream isn't writeable"));

    await expect(scheduler.schedule(titleTarget(titleId), userId)).rejects.toThrow(
      RedisUnavailableError,
    );
  });
});
