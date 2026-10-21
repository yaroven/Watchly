import { Inject, Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { Gauge, Registry } from "prom-client";
import { METRICS_REGISTRY } from "./metrics.const";

/**
 * The queues to sample. Supplied by the module that registered them, so this
 * service never imports a transcoder's queue name — the same reason the image
 * attachers arrive through a token.
 */
export const METRICS_QUEUES = Symbol("METRICS_QUEUES");

const STATES = ["waiting", "active", "delayed", "failed"] as const;

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
@Injectable()
export class QueueMetricsService {
  private readonly logger = new Logger(QueueMetricsService.name);
  private readonly jobs: Gauge<"queue" | "state">;

  constructor(
    @Inject(METRICS_REGISTRY) registry: Registry,
    @Inject(METRICS_QUEUES) private readonly queues: Queue[],
  ) {
    this.jobs = new Gauge({
      name: "bullmq_queue_jobs",
      help: "Jobs per queue per state, sampled from Redis at scrape time",
      labelNames: ["queue", "state"],
      registers: [registry],
      collect: () => this.sample(),
    });
  }

  /**
   * Swallows its own failure on purpose. `registry.metrics()` rejects as a
   * whole if any collector throws, so an unreachable Redis would blank out
   * every other metric in the process — including the ones that would tell
   * you the process is still serving requests.
   */
  private async sample(): Promise<void> {
    await Promise.all(
      this.queues.map(async (queue) => {
        try {
          const counts = await queue.getJobCounts(...STATES);

          for (const state of STATES) {
            this.jobs.set({ queue: queue.name, state }, counts[state] ?? 0);
          }
        } catch (error) {
          this.logger.error(`Failed to sample queue ${queue.name}`, error);
        }
      }),
    );
  }
}
