import { registerAs } from "@nestjs/config";
import { FEATURE_FLAGS, FeatureFlag, FeatureFlagSnapshot } from "./feature-flag.const";

export const FeatureFlagConfigName = "featureFlags";

export type FeatureFlagConfig = FeatureFlagSnapshot;

const DEFAULTS: FeatureFlagSnapshot = {
  reactions: true,
};

export const envVarOf = (flag: FeatureFlag): string =>
  `FF_${flag.toUpperCase().replace(/-/g, "_")}`;

export function parseFlag(value: string | undefined, envVar: string, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${envVar} must be "true" or "false", got "${value}"`);
}

export default registerAs(
  FeatureFlagConfigName,
  (): FeatureFlagConfig =>
    Object.fromEntries(
      FEATURE_FLAGS.map((flag) => [
        flag,
        parseFlag(process.env[envVarOf(flag)], envVarOf(flag), DEFAULTS[flag]),
      ]),
    ) as FeatureFlagConfig,
);
