import { Injectable, Logger } from "@nestjs/common";
import { Gauge } from "prom-client";
import { driftKey } from "../queues/reaction-flush/reaction-drift.const";
import { REACTION_ARCS } from "../reaction/utils/reaction-target.const";
import { RedisService } from "../redis/redis.service";

const logger = new Logger("VoteDriftMetrics");

let client: RedisService | null = null;

const drift = new Gauge({
  name: "reaction_counter_drift_subjects",
  help: "Subjects whose engagement counters the last reconciliation had to repair, by arc",
  labelNames: ["arc"],
  collect: () => sample(),
});

async function sample(): Promise<void> {
  if (!client) return;

  try {
    const values = await client.mget(REACTION_ARCS.map(driftKey));

    REACTION_ARCS.forEach((arc, index) => {
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
