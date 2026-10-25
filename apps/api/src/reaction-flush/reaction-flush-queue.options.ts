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
 * The dedup key for a pair. Not a `jobId`: an explicit one is checked for
 * existence *before* BullMQ's deduplication runs (`addStandardJob-9.lua`), so
 * it short-circuits the handling below and takes the bug with it.
 */
export const flushDeduplicationId = (arc: ReactionArc, subjectId: string, userId: string): string =>
  `vote-${arc}-${subjectId}-${userId}`;

/**
 * `keepLastIfActive` is what makes a click during a flush survive.
 *
 * Deduplicating on the pair is an economy — a burst of clicks needs one write,
 * and the job reads the final state whenever it runs. But a click that lands
 * while the job is *being processed* has already missed that read, and plain
 * deduplication would drop it: the key is alive, so no job is added, and the
 * vote reaches Redis and never reaches Postgres. It would then sit there until
 * the key expires a week later and the row quietly wins.
 *
 * With this set, BullMQ stores the late arrival and raises a follow-up job when
 * the active one finishes, keeping at most two per pair — one running, one
 * waiting. It also stops two flushes of the same pair from running at once,
 * which the pointer payload survives but need not rely on.
 */
export const FLUSH_DEDUPLICATION = { keepLastIfActive: true } as const;
export const REACTION_FLUSH_QUEUE_OPTIONS: RegisterQueueOptions = {
  name: REACTION_FLUSH_QUEUE_NAME,
  defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, delay: FLUSH_DELAY_MS },
};
