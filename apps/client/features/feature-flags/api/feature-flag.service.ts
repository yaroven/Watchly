import api from "@shared/api/axios";
import { FeatureFlags } from "../schemas/feature-flags";

const FeatureFlagService = {
  getAll: async (): Promise<Partial<FeatureFlags>> => {
    const { data } = await api.get<Partial<FeatureFlags>>("/feature-flags");
    return data;
  },
};

export default FeatureFlagService;
