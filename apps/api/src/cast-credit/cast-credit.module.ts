import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CastCreditService } from "./cast-credit.service";

@Module({
  imports: [PrismaModule],
  providers: [CastCreditService],
  exports: [CastCreditService],
})
export class CastCreditModule {}
