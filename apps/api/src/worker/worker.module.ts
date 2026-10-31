import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
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
import { EngagementModule } from "../services/engagement/engagement.module";
import { FfmpegModule } from "../services/ffmpeg/ffmpeg.module";
import { imageAttachersProvider } from "../services/image/image.attacher";
import { ImageModule } from "../services/image/image.module";
import { LogRootService } from "../services/logging/log-root.service";
import { PrismaModule } from "../services/prisma/prisma.module";
import { IMAGE_TRANSCODE_QUEUE_OPTIONS } from "../services/queues/image-transcoder/image-transcode-queue.options";
import { ImageTranscoderProcessor } from "../services/queues/image-transcoder/image-transcoder.processor";
import { ImageTranscoderService } from "../services/queues/image-transcoder/image-transcoder.service";
import { ReactionFlushModule } from "../services/queues/reaction-flush/reaction-flush.module";
import { ReactionFlushProcessor } from "../services/queues/reaction-flush/reaction-flush.processor";
import { ReactionReconcileSchedule } from "../services/queues/reaction-flush/reaction-reconcile-schedule.service";
import { ReactionReconciler } from "../services/queues/reaction-flush/reaction-reconciler.service";
import { HlsTranscoder } from "../services/queues/video-transcoder/hls-transcoder.service";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "../services/queues/video-transcoder/video-transcode-queue.options";
import { VideoTranscodeStateService } from "../services/queues/video-transcoder/video-transcode-state.service";
import { VideoTranscoderProcessor } from "../services/queues/video-transcoder/video-transcoder-processor";
import { ReactionModule } from "../services/reaction/reaction.module";
import { RedisModule } from "../services/redis/redis.module";
import { S3Module } from "../services/s3/s3.module";
import { VoteCacheModule } from "../services/vote-cache/vote-cache.module";

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
    BullModule.registerQueue(VIDEO_TRANSCODE_QUEUE_OPTIONS, IMAGE_TRANSCODE_QUEUE_OPTIONS),
    S3Module,
    PrismaModule,
    ReactionFlushModule,
    ReactionModule,
    VoteCacheModule,
    RedisModule,
    EngagementModule,
    FfmpegModule,
    ImageModule,

    ScheduleModule.forRoot(),
  ],
  providers: [
    LogRootService,
    ReactionFlushProcessor,
    ReactionReconciler,
    ReactionReconcileSchedule,

    HlsTranscoder,
    VideoTranscodeStateService,
    VideoTranscoderProcessor,
    ImageTranscoderService,
    ImageTranscoderProcessor,
    imageAttachersProvider,
  ],
})
export class WorkerModule {}
