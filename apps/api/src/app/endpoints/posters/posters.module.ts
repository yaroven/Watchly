import { Module } from "@nestjs/common";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { PosterModule } from "../../../services/poster/poster.module";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import {
  ArtistPosterController,
  SeasonPosterController,
  TitlePosterController,
} from "./posters.controller";

@Module({
  imports: [PosterModule, PrismaModule],
  controllers: [TitlePosterController, SeasonPosterController, ArtistPosterController],
  providers: [TitleExistsPipe, SeasonExistsPipe, ArtistExistsPipe],
})
export class PostersModule {}
