import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../../../services/media-asset/media-asset.module";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { TitleModule } from "../../../services/title/title.module";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { VoteCacheModule } from "../../../services/vote-cache/vote-cache.module";
import { TitlesController } from "./titles.controller";
import { TitlesService } from "./titles.service";

@Module({
  imports: [TitleModule, MediaAssetModule, PrismaModule, VoteCacheModule],
  controllers: [TitlesController],
  providers: [TitlesService, TitleExistsPipe],
})
export class TitlesModule {}
