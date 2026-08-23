import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import loggerConfig, {
  buildLoggerParams,
  LoggerConfig,
  LoggerConfigName,
} from "../config/logger.config";
import redisConfig, {
  RedisConfig,
  RedisConfigName,
  redisConnectionOptions,
} from "../config/redis.config";
import s3Config from "../config/s3.config";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "./video-transcode-queue.options";
import { VideoTranscoderProcessor } from "./video-transcoder-processor";
import { VideoTranscoderService } from "./video-transcoder.service";

/**
 * Standalone worker: the only process that runs ffmpeg. Deployed as its own
 * container so heavy transcoding load and its resource limits are isolated
 * from the HTTP API — see docker-compose service "transcoder-worker".
 */
@Module({
  imports: [
    ConfigModule.forRoot({ load: [s3Config, redisConfig, loggerConfig], isGlobal: true }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildLoggerParams(configService.get<LoggerConfig>(LoggerConfigName)!, "transcoder-worker"),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>(RedisConfigName)!;
        return { connection: redisConnectionOptions(redis) };
      },
    }),
    BullModule.registerQueue(VIDEO_TRANSCODE_QUEUE_OPTIONS),
    S3Module,
    PrismaModule,
  ],
  providers: [VideoTranscoderService, VideoTranscoderProcessor],
})
export class VideoTranscoderWorkerModule {}
