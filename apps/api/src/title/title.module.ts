import { Module } from "@nestjs/common";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { SeasonModule } from "../season/season.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

@Module({
  imports: [PrismaModule, S3Module, PosterModule, VideoTranscoderModule, SeasonModule],
  providers: [TitleService],
  controllers: [TitleController],
  exports: [TitleService],
})
export class TitleModule {}
