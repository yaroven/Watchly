import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SeasonModule } from "../season/season.module";
import { TitleEngagementModule } from "../title-engagement/title-engagement.module";
import { TitleRatingModule } from "../title-rating/title-rating.module";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";
import { WatchlistController } from "./watchlist.controller";

@Module({
  imports: [
    TitleRatingModule,
    TitleEngagementModule,
    PrismaModule,
    PosterModule,
    SeasonModule,
    MediaAssetModule,
  ],
  providers: [TitleService],
  controllers: [TitleController, WatchlistController],
  exports: [TitleService],
})
export class TitleModule {}
