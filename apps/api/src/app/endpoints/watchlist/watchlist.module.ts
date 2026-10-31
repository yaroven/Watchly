import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { TitleModule } from "../../../services/title/title.module";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { WatchlistModule } from "../../../services/watchlist/watchlist.module";
import { WatchlistController } from "./watchlist.controller";

@Module({
  imports: [WatchlistModule, TitleModule, PrismaModule],
  controllers: [WatchlistController],
  providers: [TitleExistsPipe],
})
export class WatchlistEndpointModule {}
