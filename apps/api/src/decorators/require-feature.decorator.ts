import { RequireFlagsEnabled } from "@openfeature/nestjs-sdk";
import { FeatureFlag } from "../services/feature-flag/feature-flag.const";
import { viewerContextFactory } from "../services/feature-flag/utils/viewer-context.util";

export const RequireFeature = (flag: FeatureFlag) =>
  RequireFlagsEnabled({
    flags: [{ flagKey: flag, defaultValue: false }],
    contextFactory: viewerContextFactory,
  });
