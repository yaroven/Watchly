import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { S3Module } from "src/S3/S3.module";
import { SeasonController } from "./season.controller";
import { SeasonService } from "./season.service";

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [SeasonController],
  providers: [SeasonService],
})
export class SeasonModule {}
