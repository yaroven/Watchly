import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { PosterService } from "./poster.service";

@Module({
  imports: [S3Module, PrismaModule],
  providers: [PosterService],
  exports: [PosterService],
})
export class PosterModule {}
