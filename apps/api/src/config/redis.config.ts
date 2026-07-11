import { registerAs } from "@nestjs/config";

export const RedisConfigName = "redis";

export interface RedisConfig {
  host: string;
  port: number;
}

export default registerAs(RedisConfigName, () => ({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10) || 6379,
}));
