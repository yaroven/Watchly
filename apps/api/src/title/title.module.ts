import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ViewerVotesModule } from "../reaction/viewer-votes.module";
import { SeasonModule } from "../season/season.module";
import { TitleEngagementService } from "./title-engagement.service";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";
import { TitleExistsPipe } from "./utils/title-exists.pipe";

@Module({
  imports: [PrismaModule, PosterModule, SeasonModule, MediaAssetModule, ViewerVotesModule],
  providers: [TitleService, TitleEngagementService, TitleExistsPipe],
  controllers: [TitleController],
  exports: [TitleService, TitleEngagementService],
})
export class TitleModule {}
