import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { SeasonModule } from "../../../services/season/season.module";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { SeasonsController } from "./seasons.controller";

@Module({
  imports: [SeasonModule, PrismaModule],
  controllers: [SeasonsController],
  providers: [SeasonExistsPipe],
})
export class SeasonsModule {}
