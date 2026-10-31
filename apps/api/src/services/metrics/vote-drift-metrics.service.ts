import { Injectable } from "@nestjs/common";
import { Gauge } from "prom-client";
import { Logged } from "../../decorators/logged.decorator";
import { driftKey } from "../queues/reaction-flush/reaction-drift.const";
import { REACTION_ARCS } from "../reaction/utils/reaction-target.const";
import { RedisService } from "../redis/redis.service";

let sampler: (() => Promise<void>) | undefined;

const drift = new Gauge({
  name: "reaction_counter_drift_subjects",
  help: "Subjects whose engagement counters the last reconciliation had to repair, by arc",
  labelNames: ["arc"],
  collect: async () => {
    await sampler?.();
  },
});

@Injectable()
export class VoteDriftMetricsService {
  constructor(private readonly redis: RedisService) {
    sampler = () => this.sample();
  }

  @Logged({ completedLevel: "debug" })
  private async sample(): Promise<void> {
    let values: (string | null)[];
    try {
      values = await this.readDrift();
    } catch {
      // @Logged has already logged this failure
      return;
    }

    REACTION_ARCS.forEach((arc, index) => {
      const raw = values[index];
      if (raw === null) return;

      const subjects = Number(raw);
      if (Number.isFinite(subjects)) drift.set({ arc }, subjects);
    });
  }

  @Logged({ completedLevel: "debug" })
  private readDrift(): Promise<(string | null)[]> {
    return this.redis.mget(REACTION_ARCS.map(driftKey));
  }
}
