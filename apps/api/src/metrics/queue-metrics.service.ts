import { Inject, Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { Gauge } from "prom-client";

/**
 * The queues to sample. Supplied by the module that registered them, so this
 * service never imports a transcoder's queue name — the same reason the image
 * attachers arrive through a token.
 */
export const METRICS_QUEUES = Symbol("METRICS_QUEUES");

const STATES = ["waiting", "active", "delayed", "failed"] as const;

const logger = new Logger("QueueMetrics");

/**
 * Module-level, like every other metric here, which leaves the queues to reach
 * through a holder: `collect` runs on the metric and has no instance to read
 * from. This is the one place the module-level arrangement is clumsier than an
 * injected registry would have been.
 *
 * Replaced rather than appended, so building the service twice — which happens
 * in tests — does not sample the same queue twice.
 */
let sampled: Queue[] = [];

/**
 * Queue depth is a property of Redis, not of a process, so it is sampled at
 * scrape time rather than tracked on job events — a counter kept in memory
 * would be one process's partial view and would reset on every rollout.
 *
 * Being a property of Redis is also why this lives in the api rather than with
 * the processors: the numbers are the same from either side, and the api is the
 * process that serves /metrics. The api runs two replicas in prod, so both
 * publish these series — aggregate with `max by (queue, state)`, never `sum`.
 */
const jobs = new Gauge({
  name: "bullmq_queue_jobs",
  help: "Jobs per queue per state, sampled from Redis at scrape time",
  labelNames: ["queue", "state"],
  collect: () => sample(),
});

/**
 * Swallows its own failure on purpose. `register.metrics()` rejects as a whole
 * if any collector throws, so an unreachable Redis would blank out every other
 * metric in the process — including the ones that would tell you it is still
 * serving requests.
 */
async function sample(): Promise<void> {
  await Promise.all(
    sampled.map(async (queue) => {
      try {
        const counts = await queue.getJobCounts(...STATES);

        for (const state of STATES) {
          jobs.set({ queue: queue.name, state }, counts[state] ?? 0);
        }
      } catch (error) {
        logger.error(`Failed to sample queue ${queue.name}`, error);
      }
    }),
  );
}

@Injectable()
export class QueueMetricsService {
  constructor(@Inject(METRICS_QUEUES) queues: Queue[]) {
    sampled = queues;
  }
}
