import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SeasonModule } from "../season/season.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { TitleService } from "./title.service";

@Module({
  imports: [PrismaModule, PosterModule, SeasonModule, MediaAssetModule, VoteCacheModule],
  providers: [TitleService],
  exports: [TitleService],
})
export class TitleModule {}
