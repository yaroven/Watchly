import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleEngagementController } from "./title-engagement.controller";
import { TitleEngagementService } from "./title-engagement.service";

@Module({
  imports: [PrismaModule],
  controllers: [TitleEngagementController],
  providers: [TitleEngagementService],
  exports: [TitleEngagementService],
})
export class TitleEngagementModule {}
