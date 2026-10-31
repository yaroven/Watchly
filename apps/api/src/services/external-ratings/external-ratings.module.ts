import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ExternalRatingsService } from "./external-ratings.service";
import { OmdbClient } from "./omdb-client.service";

@Module({
  imports: [PrismaModule],
  providers: [ExternalRatingsService, OmdbClient],
  exports: [ExternalRatingsService],
})
export class ExternalRatingsModule {}
