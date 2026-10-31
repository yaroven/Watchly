import { Module } from "@nestjs/common";
import { ImageModule } from "../image/image.module";
import { MediaAssetModule } from "../media-asset/media-asset.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { TitleService } from "./title.service";

@Module({
  imports: [PrismaModule, ImageModule, MediaAssetModule, VoteCacheModule],
  providers: [TitleService],
  exports: [TitleService],
})
export class TitleModule {}
