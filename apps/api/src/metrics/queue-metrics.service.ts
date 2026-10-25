import { Inject, Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { Gauge } from "prom-client";

export const METRICS_QUEUES = Symbol("METRICS_QUEUES");

const STATES = ["waiting", "active", "delayed", "failed", "completed"] as const;

const logger = new Logger("QueueMetrics");

let sampled: Queue[] = [];

const jobs = new Gauge({
  name: "bullmq_queue_jobs",
  help: "Jobs per queue per state, sampled from Redis at scrape time",
  labelNames: ["queue", "state"],
  collect: () => sample(),
});

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
