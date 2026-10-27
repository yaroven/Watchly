/** Public API of the feature-flags feature — other features and routes import from here. */
export { default as featureFlagKeys } from "./api/feature-flag.keys";
export { default as featureFlagService } from "./api/feature-flag.service";
export { default as useFeatureFlag } from "./api/use-feature-flag";
export { default as useFeatureFlags } from "./api/use-feature-flags";
export { default as FeatureGate } from "./components/FeatureGate";
export type { FeatureFlag, FeatureFlags } from "./schemas/feature-flags";
