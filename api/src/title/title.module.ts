import { Module } from "@nestjs/common";
import { S3Module } from "src/S3/S3.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { VideoTranscoderModule } from "src/video-transcoder/video-transcoder.module";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

@Module({
  imports: [PrismaModule, S3Module, VideoTranscoderModule],
  providers: [TitleService],
  controllers: [TitleController],
  exports: [TitleService],
})
export class TitleModule {}
