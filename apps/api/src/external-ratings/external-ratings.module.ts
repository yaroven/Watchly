import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ExternalRatingsController } from "./external-ratings.controller";
import { ExternalRatingsService } from "./external-ratings.service";
import { OmdbClient } from "./omdb-client.service";

@Module({
  imports: [PrismaModule],
  controllers: [ExternalRatingsController],
  providers: [ExternalRatingsService, OmdbClient],
})
export class ExternalRatingsModule {}
