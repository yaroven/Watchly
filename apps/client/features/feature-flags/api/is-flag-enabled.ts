import { FeatureFlag, FeatureFlags } from "../schemas/feature-flags";

export function isFlagEnabled(query: { data: Partial<FeatureFlags> | undefined; isError: boolean }, flag: FeatureFlag): boolean {
  if (query.isError || query.data === undefined) return false;

  return query.data[flag] === true;
}
