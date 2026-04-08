import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import redisConfig, { RedisConfig, RedisConfigName } from "./config/redis.config";
import s3Config from "./config/s3.config";
import { EpisodeModule } from "./episode/episode.module";
import { PrismaModule } from "./prisma/prisma.module";
import { S3EventModule } from "./s3-event/s3-event.module";
import { S3Module } from "./S3/S3.module";
import { SeasonModule } from "./season/season.module";
import { TitleModule } from "./title/title.module";
import { VideoTranscoderModule } from "./video-transcoder/video-transcoder.module";

@Module({
  imports: [
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
  providers: [],
})
export class AppModule {}
