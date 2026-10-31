import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Queue } from "bullmq";
import { LoggerModule } from "nestjs-pino";
import { LogRootService } from "../services/logging/log-root.service";
import { AppController } from "./app.controller";

import featureFlagConfig from "../config/feature-flag.config";
import jwtConfig, { JwtConfig, JwtConfigName } from "../config/jwt.config";
import loggerConfig, {
  buildLoggerParams,
  LoggerConfig,
  LoggerConfigName,
} from "../config/logger.config";
import omdbConfig from "../config/omdb.config";
import redisConfig, {
  queueProducerConnectionOptions,
  RedisConfig,
  RedisConfigName,
} from "../config/redis.config";
import s3Config from "../config/s3.config";
import { MediaAssetModule } from "../services/media-asset/media-asset.module";
import { METRICS_QUEUES, QueueMetricsService } from "../services/metrics/queue-metrics.service";
import { VoteDriftMetricsService } from "../services/metrics/vote-drift-metrics.service";
import { PrismaModule } from "../services/prisma/prisma.module";
import { IMAGE_TRANSCODE_QUEUE_OPTIONS } from "../services/queues/image-transcoder/image-transcode-queue.options";
import { ImageTranscoderModule } from "../services/queues/image-transcoder/image-transcoder.module";
import { REACTION_FLUSH_QUEUE_OPTIONS } from "../services/queues/reaction-flush/reaction-flush-queue.options";
import { ReactionFlushModule } from "../services/queues/reaction-flush/reaction-flush.module";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "../services/queues/video-transcoder/video-transcode-queue.options";
import { VideoTranscoderModule } from "../services/queues/video-transcoder/video-transcoder.module";
import { RedisModule } from "../services/redis/redis.module";
import { S3EventModule } from "../services/s3-event/s3-event.module";
import { S3Module } from "../services/s3/s3.module";
import { ArtistsModule } from "./endpoints/artists/artists.module";
import { AuthEndpointModule } from "./endpoints/auth/auth.module";
import { CommentsModule } from "./endpoints/comments/comments.module";
import { EpisodesModule } from "./endpoints/episodes/episodes.module";
import { ExternalRatingsEndpointModule } from "./endpoints/external-ratings/external-ratings.module";
import { FeatureFlagsModule } from "./endpoints/feature-flags/feature-flags.module";
import { GenresModule } from "./endpoints/genres/genres.module";
import { ImagesModule } from "./endpoints/images/images.module";
import { MetricsController } from "./endpoints/metrics/metrics.controller";
import { ReactionsModule } from "./endpoints/reactions/reactions.module";
import { SeasonsModule } from "./endpoints/seasons/seasons.module";
import { TitleCastEndpointModule } from "./endpoints/title-cast/title-cast.module";
import { TitlesModule } from "./endpoints/titles/titles.module";
import { UsersModule } from "./endpoints/users/users.module";
import { VideoTranscoderEndpointModule } from "./endpoints/video-transcoder/video-transcoder.module";
import { WatchlistEndpointModule } from "./endpoints/watchlist/watchlist.module";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 300,
        },
      ],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwt = configService.get<JwtConfig>(JwtConfigName)!;
        return {
          secret: jwt.secret,
          signOptions: { expiresIn: jwt.expiresIn } as JwtModuleOptions["signOptions"],
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>(RedisConfigName)!;
        return { connection: queueProducerConnectionOptions(redis) };
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildLoggerParams(configService.get<LoggerConfig>(LoggerConfigName)!, "api"),
    }),
    S3Module,
    ConfigModule.forRoot({
      load: [s3Config, redisConfig, loggerConfig, jwtConfig, omdbConfig, featureFlagConfig],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    VideoTranscoderModule,
    ImageTranscoderModule,
    TitlesModule,
    TitleCastEndpointModule,
    WatchlistEndpointModule,
    PrismaModule,
    EpisodesModule,
    SeasonsModule,
    S3EventModule,
    AuthEndpointModule,
    UsersModule,
    ArtistsModule,
    GenresModule,
    MediaAssetModule,
    ExternalRatingsEndpointModule,
    CommentsModule,
    ImagesModule,
    VideoTranscoderEndpointModule,
    FeatureFlagsModule,
    ReactionsModule,
    ReactionFlushModule,
    RedisModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [
    LogRootService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    {
      provide: METRICS_QUEUES,
      inject: [
        getQueueToken(VIDEO_TRANSCODE_QUEUE_OPTIONS.name),
        getQueueToken(IMAGE_TRANSCODE_QUEUE_OPTIONS.name),
        getQueueToken(REACTION_FLUSH_QUEUE_OPTIONS.name),
      ],
      useFactory: (video: Queue, image: Queue, reactions: Queue): Queue[] => [
        video,
        image,
        reactions,
      ],
    },
    QueueMetricsService,
    VoteDriftMetricsService,
  ],
})
export class AppModule {}
