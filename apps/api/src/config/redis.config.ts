import { registerAs } from "@nestjs/config";
import { DEV_DEFAULTS } from "../common/dev-defaults.const";
import { requireInProduction } from "../common/env.util";

export const RedisConfigName = "redis";

export interface RedisConfig {
  host: string;
  port: number;
  /** Undefined for an unauthenticated local Redis. */
  password?: string;
  /**
   * Managed Redis (DigitalOcean, ElastiCache, Upstash) refuses plaintext
   * connections, so this has to be on there. The local container has no TLS
   * at all, so it has to be off here.
   */
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

/**
 * Shape BullMQ (ioredis underneath) expects. Both entrypoints build their
 * connection from this so they cannot drift apart.
 *
 * `tls: {}` means "use TLS with the default trust store" — managed providers
 * present certificates from public CAs, so no bundled CA file is needed.
 */
export function redisConnectionOptions(config: RedisConfig) {
  return {
    host: config.host,
    port: config.port,
    ...(config.password ? { password: config.password } : {}),
    ...(config.tls ? { tls: {} } : {}),
  };
}
