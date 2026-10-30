import { Module } from "@nestjs/common";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ArtistService } from "./artist.service";

@Module({
  imports: [PrismaModule, PosterModule],
  providers: [ArtistService],
  exports: [ArtistService],
})
export class ArtistModule {}
