import { Injectable } from "@nestjs/common";
import { Gauge } from "prom-client";
import { Logged } from "../../decorators/logged.decorator";
import {
  ReactionDrift,
  ReactionDriftService,
} from "../queues/reaction-flush/reaction-drift.service";

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
  constructor(private readonly reactionDrift: ReactionDriftService) {
    sampler = () => this.sample();
  }

  @Logged({ completedLevel: "debug" })
  private async sample(): Promise<void> {
    let repaired: ReactionDrift;
    try {
      repaired = await this.reactionDrift.read();
    } catch {
      // @Logged has already logged this failure
      return;
    }

    for (const [arc, subjects] of Object.entries(repaired)) {
      drift.set({ arc }, subjects);
    }
  }
}
