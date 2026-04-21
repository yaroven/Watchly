import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import s3Config from "../config/s3.config";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../S3/S3.module";
import { VideoTranscoderModule } from "../video-transcoder/video-transcoder.module";
import { S3EventService } from "./s3-event.service";

@Module({
  imports: [ConfigModule.forFeature(s3Config), VideoTranscoderModule, PrismaModule, S3Module],
  providers: [S3EventService],
  exports: [S3EventService],
})
export class S3EventModule {}
