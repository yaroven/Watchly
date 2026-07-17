import { Module } from "@nestjs/common";
import { S3Module } from "../s3/s3.module";
import { PosterService } from "./poster.service";

@Module({
  imports: [S3Module],
  providers: [PosterService],
  exports: [PosterService],
})
export class PosterModule {}
