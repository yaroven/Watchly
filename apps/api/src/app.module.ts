import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import redisConfig, { RedisConfig, RedisConfigName } from "./config/redis.config";
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
          limit: 10,
        },
      ],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>(RedisConfigName)!;
        return {
          connection: {
            host: redis.host,
            port: redis.port,
          },
        };
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
        level: "info",
      },
    }),
    S3Module,
    ConfigModule.forRoot({
      load: [s3Config, redisConfig],
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
