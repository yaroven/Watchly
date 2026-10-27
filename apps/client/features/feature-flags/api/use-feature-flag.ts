import { FeatureFlag } from "../schemas/feature-flags";
import { isFlagEnabled } from "./is-flag-enabled";
import useFeatureFlags from "./use-feature-flags";

const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const { data, isError } = useFeatureFlags();

  return isFlagEnabled({ data, isError }, flag);
};

export default useFeatureFlag;
