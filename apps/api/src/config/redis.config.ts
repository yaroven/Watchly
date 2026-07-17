import { registerAs } from "@nestjs/config";
import { DEV_DEFAULTS } from "../common/dev-defaults.const";
import { requireInProduction } from "../common/env.util";

export const RedisConfigName = "redis";

export interface RedisConfig {
  host: string;
  port: number;
}

export default registerAs(RedisConfigName, () => ({
  host: requireInProduction(process.env.REDIS_HOST, "REDIS_HOST", DEV_DEFAULTS.REDIS_HOST),
  port:
    parseInt(
      requireInProduction(process.env.REDIS_PORT, "REDIS_PORT", DEV_DEFAULTS.REDIS_PORT),
      10,
    ) || 6379,
}));
