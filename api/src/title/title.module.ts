import { Module } from "@nestjs/common";
import { EpisodeModule } from "../episode/episode.module";
import { SeasonModule } from "../season/season.module";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

@Module({
  imports: [PrismaModule, S3Module, VideoTranscoderModule, EpisodeModule, SeasonModule],
  providers: [TitleService],
  controllers: [TitleController],
  exports: [TitleService],
})
export class TitleModule {}
