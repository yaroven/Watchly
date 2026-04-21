import { Module } from "@nestjs/common";
import { S3Module } from "../S3/S3.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

@Module({
  imports: [PrismaModule, S3Module, VideoTranscoderModule],
  providers: [TitleService],
  controllers: [TitleController],
  exports: [TitleService],
})
export class TitleModule {}
