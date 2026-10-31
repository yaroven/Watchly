import { Inject, Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { Gauge } from "prom-client";
import { Logged } from "../../decorators/logged.decorator";

export const METRICS_QUEUES = Symbol("METRICS_QUEUES");

const STATES = ["waiting", "active", "delayed", "failed", "completed"] as const;

let sampler: (() => Promise<void>) | undefined;

const jobs = new Gauge({
  name: "bullmq_queue_jobs",
  help: "Jobs per queue per state, sampled from Redis at scrape time",
  labelNames: ["queue", "state"],
  collect: async () => {
    await sampler?.();
  },
});

@Injectable()
export class QueueMetricsService {
  constructor(@Inject(METRICS_QUEUES) private readonly queues: Queue[]) {
    sampler = () => this.sample();
  }

  @Logged({ completedLevel: "debug" })
  private async sample(): Promise<void> {
    await Promise.all(
      this.queues.map(async (queue) => {
        let counts: Record<string, number>;
        try {
          counts = await this.countJobs(queue);
        } catch {
          // @Logged has already logged this failure
          return;
        }

        for (const state of STATES) {
          jobs.set({ queue: queue.name, state }, counts[state] ?? 0);
        }
      }),
    );
  }

  @Logged({ completedLevel: "debug" })
  private countJobs(queue: Queue): Promise<Record<string, number>> {
    return queue.getJobCounts(...STATES);
  }
}
