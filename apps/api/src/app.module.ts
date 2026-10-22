import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Queue } from "bullmq";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { ArtistModule } from "./artist/artist.module";
import { AuthModule } from "./auth/auth.module";
import { CommentModule } from "./comment/comment.module";
import jwtConfig, { JwtConfig, JwtConfigName } from "./config/jwt.config";
import loggerConfig, {
  buildLoggerParams,
  LoggerConfig,
  LoggerConfigName,
} from "./config/logger.config";
import omdbConfig from "./config/omdb.config";
import redisConfig, {
  RedisConfig,
  RedisConfigName,
  redisConnectionOptions,
} from "./config/redis.config";
import s3Config from "./config/s3.config";
import { EpisodeModule } from "./episode/episode.module";
import { ExternalRatingsModule } from "./external-ratings/external-ratings.module";
import { GenreModule } from "./genre/genre.module";
import { IMAGE_TRANSCODE_QUEUE_OPTIONS } from "./image-transcoder/image-transcode-queue.options";
import { ImageTranscoderModule } from "./image-transcoder/image-transcoder.module";
import { MediaAssetModule } from "./media-asset/media-asset.module";
import { MetricsController } from "./metrics/metrics.controller";
import { METRICS_QUEUES, QueueMetricsService } from "./metrics/queue-metrics.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ReactionModule } from "./reaction/reaction.module";
import { S3EventModule } from "./s3-event/s3-event.module";
import { S3Module } from "./s3/s3.module";
import { SeasonModule } from "./season/season.module";
import { TitleCastModule } from "./title-cast/title-cast.module";
import { TitleModule } from "./title/title.module";
import { UserAvatarModule } from "./user-avatar/user-avatar.module";
import { UserModule } from "./user/user.module";
import { VIDEO_TRANSCODE_QUEUE_OPTIONS } from "./video-transcoder/video-transcode-queue.options";
import { VideoTranscoderModule } from "./video-transcoder/video-transcoder.module";
import { WatchlistModule } from "./watchlist/watchlist.module";

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
      load: [s3Config, redisConfig, loggerConfig, jwtConfig, omdbConfig],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    VideoTranscoderModule,
    ImageTranscoderModule,
    TitleModule,
    TitleCastModule,
    WatchlistModule,
    PrismaModule,
    EpisodeModule,
    SeasonModule,
    S3EventModule,
    AuthModule,
    UserModule,
    UserAvatarModule,
    ArtistModule,
    GenreModule,
    MediaAssetModule,
    ExternalRatingsModule,
    CommentModule,
    ReactionModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Queue depth is a property of Redis, not of a process, so the api reads
    // the same numbers the worker would. It lives here because this is the
    // process that serves /metrics.
    //
    // In prod the api runs two replicas and both publish these series, so
    // aggregate with `max by (queue, state)` rather than summing.
    {
      provide: METRICS_QUEUES,
      inject: [
        getQueueToken(VIDEO_TRANSCODE_QUEUE_OPTIONS.name),
        getQueueToken(IMAGE_TRANSCODE_QUEUE_OPTIONS.name),
      ],
      useFactory: (video: Queue, image: Queue): Queue[] => [video, image],
    },
    QueueMetricsService,
  ],
})
export class AppModule {}
