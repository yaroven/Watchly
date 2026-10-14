import { Module } from "@nestjs/common";
import { EpisodeExistsPipe } from "../episode/utils/episode-exists.pipe";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { EpisodeMediaController } from "./episode-media.controller";
import { MediaAssetService } from "./media-asset.service";
import { TitleMediaController } from "./title-media.controller";

@Module({
  imports: [S3Module, VideoTranscoderModule, PrismaModule],
  providers: [MediaAssetService, TitleExistsPipe, EpisodeExistsPipe],
  controllers: [TitleMediaController, EpisodeMediaController],
  exports: [MediaAssetService],
})
export class MediaAssetModule {}
