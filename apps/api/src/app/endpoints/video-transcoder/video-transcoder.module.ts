import { Module } from "@nestjs/common";
import { VideoTranscoderModule } from "../../../services/queues/video-transcoder/video-transcoder.module";
import { VideoTranscoderController } from "./video-transcoder.controller";

@Module({
  imports: [VideoTranscoderModule],
  controllers: [VideoTranscoderController],
})
export class VideoTranscoderEndpointModule {}
