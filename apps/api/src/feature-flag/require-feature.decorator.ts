import { RequireFlagsEnabled } from "@openfeature/nestjs-sdk";
import { FeatureFlag } from "./feature-flag.const";
import { viewerContextFactory } from "./viewer-context.util";

export const RequireFeature = (flag: FeatureFlag) =>
  RequireFlagsEnabled({
    flags: [{ flagKey: flag, defaultValue: false }],
    contextFactory: viewerContextFactory,
  });
