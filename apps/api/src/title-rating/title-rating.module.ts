import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleRatingController } from "./title-rating.controller";
import { TitleRatingService } from "./title-rating.service";

@Module({
  imports: [PrismaModule],
  controllers: [TitleRatingController],
  providers: [TitleRatingService],
  // TitleService reads it to put the Watchly score on a title response.
  exports: [TitleRatingService],
})
export class TitleRatingModule {}
