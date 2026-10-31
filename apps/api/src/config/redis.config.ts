import { registerAs } from "@nestjs/config";
import { DEV_DEFAULTS } from "../common/dev-defaults.const";
import { requireInProduction } from "../common/utils/env.util";

export const RedisConfigName = "redis";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls: boolean;
}

export default registerAs(RedisConfigName, (): RedisConfig => ({
  host: requireInProduction(process.env.REDIS_HOST, "REDIS_HOST", DEV_DEFAULTS.REDIS_HOST),
  port:
    parseInt(
      requireInProduction(process.env.REDIS_PORT, "REDIS_PORT", DEV_DEFAULTS.REDIS_PORT),
      10,
    ) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true",
}));

export function redisConnectionOptions(config: RedisConfig) {
  return {
    host: config.host,
    port: config.port,
    ...(config.password ? { password: config.password } : {}),
    ...(config.tls ? { tls: {} } : {}),
  };
}

export function queueProducerConnectionOptions(config: RedisConfig) {
  return { ...redisConnectionOptions(config), enableOfflineQueue: false, maxRetriesPerRequest: 1 };
}
