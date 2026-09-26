import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PrismaModule } from "../prisma/prisma.module";
import { EpisodeController } from "./episode.controller";
import { EpisodeService } from "./episode.service";

@Module({
  imports: [PrismaModule, MediaAssetModule],
  providers: [EpisodeService],
  controllers: [EpisodeController],
  exports: [EpisodeService],
})
export class EpisodeModule {}
