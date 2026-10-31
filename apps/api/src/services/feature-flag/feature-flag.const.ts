export const FEATURE_FLAGS = ["reactions"] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type FeatureFlagSnapshot = Record<FeatureFlag, boolean>;
