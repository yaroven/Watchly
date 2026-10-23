import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisConfig, RedisConfigName, redisConnectionOptions } from "../config/redis.config";

/**
 * A Redis client of our own, beside the one BullMQ builds for itself. It talks
 * to the same instance — `redisConnectionOptions` is the same factory the queue
 * connection uses — but owning it is what lets a caller run plain commands
 * without reaching into a `Queue` for its connection.
 *
 * Extends the client rather than wrapping it, the way `PrismaService` extends
 * `PrismaClient`: there is no subset of Redis this service is trying to be.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      ...redisConnectionOptions(configService.get<RedisConfig>(RedisConfigName)!),
      // Fail fast instead of queueing. A command issued while the socket is
      // down rejects rather than waiting for a reconnect, which is what lets
      // the write path answer 503 and the read path fall back to Postgres
      // instead of both hanging on a Redis that is being redeployed.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    // `quit` is the graceful close, but it needs a writable socket and offline
    // queueing is off — and a shutdown is exactly when the socket may already
    // be gone. `disconnect` is synchronous and safe in either state.
    try {
      await this.quit();
    } catch {
      this.disconnect();
    }
  }
}
