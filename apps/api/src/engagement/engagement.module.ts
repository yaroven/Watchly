import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EngagementCountersService } from "./engagement-counters.service";

@Module({
  imports: [PrismaModule],
  providers: [EngagementCountersService],
  exports: [EngagementCountersService],
})
export class EngagementModule {}
