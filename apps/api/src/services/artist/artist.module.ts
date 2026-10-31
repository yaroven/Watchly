import { Module } from "@nestjs/common";
import { ImageModule } from "../image/image.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ArtistService } from "./artist.service";

@Module({
  imports: [PrismaModule, ImageModule],
  providers: [ArtistService],
  exports: [ArtistService],
})
export class ArtistModule {}
