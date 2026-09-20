import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import loggerConfig, {
  buildLoggerParams,
  LoggerConfig,
  LoggerConfigName,
} from "./config/logger.config";
import redisConfig, {
  RedisConfig,
  RedisConfigName,
  redisConnectionOptions,
} from "./config/redis.config";
import s3Config from "./config/s3.config";
import { EpisodeModule } from "./episode/episode.module";
import { PrismaModule } from "./prisma/prisma.module";
import { S3EventModule } from "./s3-event/s3-event.module";
import { S3Module } from "./s3/s3.module";
import { SeasonModule } from "./season/season.module";
import { TitleModule } from "./title/title.module";
import { VideoTranscoderModule } from "./video-transcoder/video-transcoder.module";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          // A single Discover page load alone fires 7-10+ GET /title
          // requests (one per catalog row); 10/min was tripping normal
          // browsing within seconds. This keeps basic abuse protection
          // while giving real usage enough headroom.
          limit: 300,
        },
      ],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>(RedisConfigName)!;
        return { connection: redisConnectionOptions(redis) };
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildLoggerParams(configService.get<LoggerConfig>(LoggerConfigName)!, "api"),
    }),
    S3Module,
    ConfigModule.forRoot({
      load: [s3Config, redisConfig, loggerConfig],
      isGlobal: true,
    }),
    VideoTranscoderModule,
    TitleModule,
    PrismaModule,
    EpisodeModule,
    SeasonModule,
    S3EventModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
