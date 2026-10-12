import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { SeasonExistsPipe } from "../season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { PosterService } from "./poster.service";
import { SeasonPosterController, TitlePosterController } from "./title-poster.controller";

@Module({
  imports: [S3Module, PrismaModule],
  providers: [PosterService, TitleExistsPipe, SeasonExistsPipe],
  controllers: [TitlePosterController, SeasonPosterController],
  exports: [PosterService],
})
export class PosterModule {}
