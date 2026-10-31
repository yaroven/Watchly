import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleEngagementModule } from "../title-engagement/title-engagement.module";
import { TitleModule } from "../title/title.module";
import { WatchlistService } from "./watchlist.service";

@Module({
  imports: [PrismaModule, TitleModule, TitleEngagementModule],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
