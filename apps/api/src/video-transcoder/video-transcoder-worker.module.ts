import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { LoggerModule } from "nestjs-pino";
import loggerConfig, {
  buildLoggerParams,
  LoggerConfig,
  LoggerConfigName,
} from "../config/logger.config";
import metricsConfig from "../config/metrics.config";
import redisConfig, {
  RedisConfig,
  RedisConfigName,
  redisConnectionOptions,
} from "../config/redis.config";
import s3Config from "../config/s3.config";
import { IMAGE_TRANSCODE_QUEUE_OPTIONS } from "../image-transcoder/image-transcode-queue.options";
import { ImageTranscoderProcessor } from "../image-transcoder/image-transcoder.processor";
import { ImageTranscoderService } from "../image-transcoder/image-transcoder.service";
import {
  IMAGE_ATTACHERS,
  ProcessedImageAttacher,
} from "../image-transcoder/processed-image-attacher";
import { MetricsModule } from "../metrics/metrics.module";
import { METRICS_QUEUES, QueueMetricsService } from "../metrics/queue-metrics.service";
import {
  POSTER_IMAGE_ATTACHERS,
  posterImageAttachersProvider,
} from "../poster/poster-image.attacher";
import { PosterService } from "../poster/poster.service";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { AvatarImageAttacher } from "../user-avatar/avatar-image.attacher";
import { UserAvatarService } from "../user-avatar/user-avatar.service";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "./video-transcode-queue.options";
import { VideoTranscoderProcessor } from "./video-transcoder-processor";
import { VideoTranscoderService } from "./video-transcoder.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [s3Config, redisConfig, loggerConfig, metricsConfig],
      isGlobal: true,
    }),
    MetricsModule,
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
    BullModule.registerQueue(VIDEO_TRANSCODE_QUEUE_OPTIONS, IMAGE_TRANSCODE_QUEUE_OPTIONS),
    S3Module,
    PrismaModule,
  ],
  providers: [
    // Queue depth is published from the worker alone. The api holds the same
    // producers, and two replicas of it would publish the same numbers twice.
    {
      provide: METRICS_QUEUES,
      inject: [
        getQueueToken(VIDEO_TRANSCODE_QUEUE_OPTIONS.name),
        getQueueToken(IMAGE_TRANSCODE_QUEUE_OPTIONS.name),
      ],
      useFactory: (video: Queue, image: Queue): Queue[] => [video, image],
    },
    QueueMetricsService,
    VideoTranscoderService,
    VideoTranscoderProcessor,
    ImageTranscoderService,
    ImageTranscoderProcessor,
    UserAvatarService,
    AvatarImageAttacher,
    PosterService,
    posterImageAttachersProvider,
    {
      provide: IMAGE_ATTACHERS,
      inject: [AvatarImageAttacher, POSTER_IMAGE_ATTACHERS],
      useFactory: (
        avatar: ProcessedImageAttacher,
        posters: ProcessedImageAttacher[],
      ): ProcessedImageAttacher[] => [avatar, ...posters],
    },
  ],
})
export class VideoTranscoderWorkerModule {}
