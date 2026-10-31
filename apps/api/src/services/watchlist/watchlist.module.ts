import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleModule } from "../title/title.module";
import { WatchlistService } from "./watchlist.service";

@Module({
  imports: [PrismaModule, TitleModule],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
