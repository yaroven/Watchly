import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ExternalRatingsController } from "./external-ratings.controller";
import { ExternalRatingsService } from "./external-ratings.service";

@Module({
  imports: [PrismaModule],
  controllers: [ExternalRatingsController],
  providers: [ExternalRatingsService],
})
export class ExternalRatingsModule {}
