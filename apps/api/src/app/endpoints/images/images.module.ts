import { Module } from "@nestjs/common";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { ImageModule } from "../../../services/image/image.module";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import {
  ArtistPhotoController,
  SeasonPosterController,
  TitlePosterController,
  UserAvatarController,
} from "./images.controller";

@Module({
  imports: [ImageModule, PrismaModule],
  controllers: [
    TitlePosterController,
    SeasonPosterController,
    ArtistPhotoController,
    UserAvatarController,
  ],
  providers: [TitleExistsPipe, SeasonExistsPipe, ArtistExistsPipe],
})
export class ImagesModule {}
