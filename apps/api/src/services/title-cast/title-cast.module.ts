import { Module } from "@nestjs/common";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleCastService } from "./title-cast.service";

@Module({
  imports: [PrismaModule, PosterModule],
  providers: [TitleCastService],
  exports: [TitleCastService],
})
export class TitleCastModule {}
