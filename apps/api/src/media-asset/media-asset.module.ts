import { Module } from "@nestjs/common";
import { S3Module } from "../s3/s3.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { MediaAssetService } from "./media-asset.service";

@Module({
  imports: [S3Module, VideoTranscoderModule],
  providers: [MediaAssetService],
  exports: [MediaAssetService],
})
export class MediaAssetModule {}
