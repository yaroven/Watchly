import { Module } from "@nestjs/common";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SeasonController } from "./season.controller";
import { SeasonService } from "./season.service";
import { SeasonExistsPipe } from "./utils/season-exists.pipe";

@Module({
  imports: [PrismaModule, PosterModule, MediaAssetModule],
  controllers: [SeasonController],
  providers: [SeasonService, SeasonExistsPipe],
  exports: [SeasonService],
})
export class SeasonModule {}
