import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import s3Config from "src/config/s3.config";
import { PrismaModule } from "src/prisma/prisma.module";
import { S3Module } from "src/S3/S3.module";
import { VideoTranscoderModule } from "src/video-transcoder/video-transcoder.module";
import { S3EventService } from "./s3-event.service";

@Module({
  imports: [ConfigModule.forFeature(s3Config), VideoTranscoderModule, PrismaModule, S3Module],
  providers: [S3EventService],
  exports: [S3EventService],
})
export class S3EventModule {}
