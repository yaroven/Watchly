import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportService } from "./report.service";

@Module({
  imports: [PrismaModule],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
