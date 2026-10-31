import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisConfig, RedisConfigName, redisConnectionOptions } from "../../config/redis.config";

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      ...redisConnectionOptions(configService.get<RedisConfig>(RedisConfigName)!),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.quit();
    } catch {
      this.disconnect();
    }
  }
}
