import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../../../services/media-asset/media-asset.module";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { TitleEngagementModule } from "../../../services/title-engagement/title-engagement.module";
import { TitleModule } from "../../../services/title/title.module";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { TitlesController } from "./titles.controller";

@Module({
  imports: [TitleModule, TitleEngagementModule, MediaAssetModule, PrismaModule],
  controllers: [TitlesController],
  providers: [TitleExistsPipe],
})
export class TitlesModule {}
