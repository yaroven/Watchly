import { FeatureFlag } from "../schemas/feature-flags";
import { isFlagEnabled } from "./is-flag-enabled";
import useFeatureFlags from "./use-feature-flags";

/** `true` only once the api has said the feature is on; `false` while loading, on error, or when off. */
const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const { data, isError } = useFeatureFlags();

  return isFlagEnabled({ data, isError }, flag);
};

export default useFeatureFlag;
