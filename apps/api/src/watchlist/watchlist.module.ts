import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleModule } from "../title/title.module";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { TitleWatchlistController } from "./title-watchlist.controller";
import { WatchlistController } from "./watchlist.controller";
import { WatchlistService } from "./watchlist.service";

@Module({
  imports: [PrismaModule, TitleModule],
  providers: [WatchlistService, TitleExistsPipe],
  controllers: [WatchlistController, TitleWatchlistController],
  exports: [WatchlistService],
})
export class WatchlistModule {}
