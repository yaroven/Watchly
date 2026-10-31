export interface FeatureFlags {
  reactions: boolean;
}

export type FeatureFlag = keyof FeatureFlags;
