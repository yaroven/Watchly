import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SeasonService } from "./season.service";

@Module({
  imports: [PrismaModule, PosterModule, MediaAssetModule],
  providers: [SeasonService],
  exports: [SeasonService],
})
export class SeasonModule {}
