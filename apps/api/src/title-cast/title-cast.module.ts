import { Module } from "@nestjs/common";
import { PosterModule } from "../poster/poster.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { TitleCastController } from "./title-cast.controller";
import { TitleCastService } from "./title-cast.service";

@Module({
  imports: [PrismaModule, PosterModule],
  providers: [TitleCastService, TitleExistsPipe],
  controllers: [TitleCastController],
  exports: [TitleCastService],
})
export class TitleCastModule {}
