import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { SeasonController } from "./season.controller";
import { SeasonService } from "./season.service";

@Module({
  imports: [PrismaModule, S3Module, VideoTranscoderModule],
  controllers: [SeasonController],
  providers: [SeasonService],
  exports: [SeasonService],
})
export class SeasonModule {}
