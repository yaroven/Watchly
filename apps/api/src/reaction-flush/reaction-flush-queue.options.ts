import { RegisterQueueOptions } from "@nestjs/bullmq";
import { DEFAULT_JOB_OPTIONS } from "../common/utils/job-queue.const";
import { ReactionArc } from "../reaction/utils/reaction-target.const";

export const REACTION_FLUSH_QUEUE_NAME = "reaction-flush";
export const REACTION_FLUSH_JOB_NAME = "flush-vote";

/**
 * A pointer at a pair, never the vote itself.
 *
 * This is what makes the flush indifferent to order and to retries: the
 * processor reads whatever the cache holds when it runs, so two jobs for the
 * same pair — a double click, a switch of sides, a withdrawal right after —
 * reach the same answer no matter which order they are worked in. A delta
 * payload would have to arrive exactly once and in sequence, and BullMQ
 * promises neither.
 */
export interface FlushVoteJob {
  arc: ReactionArc;
  subjectId: string;
  userId: string;
}

/**
 * The window in which clicks on one pair collapse into a single write. Long
 * enough to swallow a double click and a change of mind, short enough that the
 * count other viewers read is only ever a couple of seconds behind.
 */
export const FLUSH_DELAY_MS = 2_000;

/**
 * `DEFAULT_JOB_OPTIONS` carries `removeOnComplete: true`, and here that is
 * load-bearing rather than tidiness: `queue.add` with a `jobId` that already
 * exists returns the existing job instead of adding one, so a *kept* completed
 * job would block every later vote by the same viewer on the same subject —
 * silently, since nothing errors. Keeping completed jobs on this queue would
 * mean votes that stop reaching Postgres after the first one.
 */
export const REACTION_FLUSH_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: REACTION_FLUSH_QUEUE_NAME,
  defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, delay: FLUSH_DELAY_MS },
};
