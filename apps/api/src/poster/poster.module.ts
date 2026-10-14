import { Module } from "@nestjs/common";
import { ArtistExistsPipe } from "../artist/utils/artist-exists.pipe";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { SeasonExistsPipe } from "../season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { PosterService } from "./poster.service";
import {
  ArtistPosterController,
  SeasonPosterController,
  TitlePosterController,
} from "./title-poster.controller";

@Module({
  imports: [S3Module, PrismaModule],
  providers: [PosterService, TitleExistsPipe, SeasonExistsPipe, ArtistExistsPipe],
  controllers: [TitlePosterController, SeasonPosterController, ArtistPosterController],
  exports: [PosterService],
})
export class PosterModule {}
