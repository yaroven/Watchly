import { Module } from "@nestjs/common";
import { ImageModule } from "../image/image.module";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SeasonService } from "./season.service";

@Module({
  imports: [PrismaModule, ImageModule, MediaAssetModule],
  providers: [SeasonService],
  exports: [SeasonService],
})
export class SeasonModule {}
