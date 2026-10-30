import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ReactionReconciler } from "./reaction-reconciler.service";

@Injectable()
export class ReactionReconcileSchedule {
  constructor(private readonly reconciler: ReactionReconciler) {}

  @Cron("30 2 * * *")
  async nightly(): Promise<void> {
    await this.reconciler.reconcile();
  }
}
