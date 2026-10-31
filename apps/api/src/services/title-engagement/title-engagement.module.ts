import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { VoteCacheModule } from "../vote-cache/vote-cache.module";
import { TitleEngagementService } from "./title-engagement.service";

@Module({
  imports: [PrismaModule, VoteCacheModule],
  providers: [TitleEngagementService],
  exports: [TitleEngagementService],
})
export class TitleEngagementModule {}
