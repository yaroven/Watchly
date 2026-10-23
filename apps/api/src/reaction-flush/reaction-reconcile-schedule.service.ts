import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ReactionReconciler } from "./reaction-reconciler.service";

/**
 * When the reconciler runs, and nothing else.
 *
 * Split from the reconciler because importing `@nestjs/schedule` makes a file
 * untestable here — it ships ESM, jest runs CJS, and the parse fails before any
 * test does. Keeping the decorator alone in a class with no logic of its own
 * means the sweep it triggers is covered and the only uncovered line is the
 * schedule.
 *
 * 02:30 rather than midnight, where `ExternalRatingsService` already is.
 */
@Injectable()
export class ReactionReconcileSchedule {
  constructor(private readonly reconciler: ReactionReconciler) {}

  @Cron("30 2 * * *")
  async nightly(): Promise<void> {
    await this.reconciler.reconcile();
  }
}
