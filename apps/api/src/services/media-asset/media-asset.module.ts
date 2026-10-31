import { Module } from "@nestjs/common";
import { ImageModule } from "../image/image.module";
import { VideoTranscoderModule } from "../queues/video-transcoder/video-transcoder.module";
import { S3Module } from "../s3/s3.module";
import { MediaAssetService } from "./media-asset.service";

@Module({
  imports: [S3Module, VideoTranscoderModule, ImageModule],
  providers: [MediaAssetService],
  exports: [MediaAssetService],
})
export class MediaAssetModule {}
