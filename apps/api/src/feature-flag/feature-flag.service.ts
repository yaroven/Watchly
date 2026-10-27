import { Injectable } from "@nestjs/common";
import { Client, EvaluationContext, OpenFeatureClient } from "@openfeature/nestjs-sdk";
import { FEATURE_FLAGS, FeatureFlag, FeatureFlagSnapshot } from "./feature-flag.const";

@Injectable()
export class FeatureFlagService {
  constructor(@OpenFeatureClient() private readonly client: Client) {}

  isEnabled(flag: FeatureFlag, viewer: EvaluationContext = {}): Promise<boolean> {
    return this.client.getBooleanValue(flag, false, viewer);
  }

  async snapshotFor(viewer: EvaluationContext = {}): Promise<FeatureFlagSnapshot> {
    const entries = await Promise.all(
      FEATURE_FLAGS.map(async (flag) => [flag, await this.isEnabled(flag, viewer)] as const),
    );

    return Object.fromEntries(entries) as FeatureFlagSnapshot;
  }
}
