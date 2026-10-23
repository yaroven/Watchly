import { Injectable, Logger } from "@nestjs/common";
import { Gauge } from "prom-client";
import { DRIFT_ARCS, driftKey } from "../reaction-flush/reaction-drift.const";
import { RedisService } from "../redis/redis.service";

const logger = new Logger("VoteDriftMetrics");

/**
 * Module-level, like every other metric here, with the client reached through a
 * holder because `collect` runs on the metric and has no instance to read
 * from — the same arrangement `QueueMetricsService` uses, and replaced rather
 * than appended so building the service twice leaves one sampler.
 */
let client: RedisService | null = null;

/**
 * Read by the api because the worker serves no `/metrics`, exactly as queue
 * depth is. The reconciler leaves its findings in Redis; this samples them.
 *
 * Carries an `arc` label and is set only for an arc that actually answered, so
 * the series does not exist before the first reconciliation has run. An
 * unlabelled gauge would report a confident `0` from registration onwards, and
 * then an alert on drift could never fire.
 */
const drift = new Gauge({
  name: "reaction_counter_drift_subjects",
  help: "Subjects whose engagement counters the last reconciliation had to repair, by arc",
  labelNames: ["arc"],
  collect: () => sample(),
});

/**
 * Swallows its own failure, for the reason every collector here does:
 * `register.metrics()` rejects as a unit, so an unreachable Redis would blank
 * out every other metric in the process.
 */
async function sample(): Promise<void> {
  if (!client) return;

  try {
    const values = await client.mget(DRIFT_ARCS.map(driftKey));

    DRIFT_ARCS.forEach((arc, index) => {
      const raw = values[index];
      if (raw === null) return;

      const subjects = Number(raw);
      if (Number.isFinite(subjects)) drift.set({ arc }, subjects);
    });
  } catch (error) {
    logger.error("Failed to sample the reaction counter drift", error);
  }
}

@Injectable()
export class VoteDriftMetricsService {
  constructor(redis: RedisService) {
    client = redis;
  }
}
