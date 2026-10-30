import { Module } from "@nestjs/common";
import { EpisodeModule } from "../../../services/episode/episode.module";
import { EpisodeExistsPipe } from "../../../services/episode/utils/episode-exists.pipe";
import { MediaAssetModule } from "../../../services/media-asset/media-asset.module";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { EpisodesController } from "./episodes.controller";

@Module({
  imports: [EpisodeModule, MediaAssetModule, PrismaModule],
  controllers: [EpisodesController],
  providers: [EpisodeExistsPipe],
})
export class EpisodesModule {}
