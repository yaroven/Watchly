import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SeasonModule } from "../season/season.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { TitleEngagementService } from "./title-engagement.service";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";
import { TitleExistsPipe } from "./utils/title-exists.pipe";

@Module({
  imports: [PrismaModule, PosterModule, SeasonModule, MediaAssetModule, VoteCacheModule],
  providers: [TitleService, TitleEngagementService, TitleExistsPipe],
  controllers: [TitleController],
  exports: [TitleService, TitleEngagementService],
})
export class TitleModule {}
