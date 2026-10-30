import { Module } from "@nestjs/common";
import { ArtistModule } from "../../../services/artist/artist.module";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { ArtistsController } from "./artists.controller";

@Module({
  imports: [ArtistModule, PrismaModule],
  controllers: [ArtistsController],
  providers: [ArtistExistsPipe],
})
export class ArtistsModule {}
