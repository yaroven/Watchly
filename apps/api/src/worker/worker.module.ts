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
import { IMAGE_TRANSCODE_QUEUE_OPTIONS } from "../image-transcoder/image-transcode-queue.options";
import { ImageTranscoderProcessor } from "../image-transcoder/image-transcoder.processor";
import { ImageTranscoderService } from "../image-transcoder/image-transcoder.service";
import {
  IMAGE_ATTACHERS,
  ProcessedImageAttacher,
} from "../image-transcoder/processed-image-attacher";
import {
  POSTER_IMAGE_ATTACHERS,
  posterImageAttachersProvider,
} from "../poster/poster-image.attacher";
import { PosterService } from "../poster/poster.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ReactionFlushModule } from "../reaction-flush/reaction-flush.module";
import { ReactionFlushProcessor } from "../reaction-flush/reaction-flush.processor";
import { ReactionModule } from "../reaction/reaction.module";
import { S3Module } from "../s3/s3.module";
import { AvatarImageAttacher } from "../user-avatar/avatar-image.attacher";
import { UserAvatarService } from "../user-avatar/user-avatar.service";
import { HlsTranscoder } from "../video-transcoder/hls-transcoder.service";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "../video-transcoder/video-transcode-queue.options";
import { VideoTranscodeStateService } from "../video-transcoder/video-transcode-state.service";
import { VideoTranscoderProcessor } from "../video-transcoder/video-transcoder-processor";

/**
 * The whole of the worker process: `worker-main.ts` builds its context from
 * this module and nothing else, so whatever the worker does has to be wired
 * here. It was named after the video transcoder while that was all it ran, and
 * the name stopped being true as soon as the image side moved in beside it.
 * Composing a process is not a domain, which is why it no longer lives inside
 * one either.
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
    BullModule.registerQueue(VIDEO_TRANSCODE_QUEUE_OPTIONS, IMAGE_TRANSCODE_QUEUE_OPTIONS),
    S3Module,
    PrismaModule,
    ReactionFlushModule,
    ReactionModule,
  ],
  providers: [
    // Mirrors cached votes onto the rows. Nothing to do with ffmpeg; it is
    // here because this is the process that works queues.
    ReactionFlushProcessor,
    // The conversion half, which only this process has the ffmpeg binary for.
    HlsTranscoder,
    VideoTranscodeStateService,
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
export class WorkerModule {}
