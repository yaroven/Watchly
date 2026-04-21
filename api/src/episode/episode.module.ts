import { forwardRef, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../S3/S3.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { EpisodeController } from "./episode.controller";
import { EpisodeService } from "./episode.service";

@Module({
  imports: [PrismaModule, S3Module, forwardRef(() => VideoTranscoderModule)],
  providers: [EpisodeService],
  controllers: [EpisodeController],
  exports: [EpisodeService],
})
export class EpisodeModule {}
