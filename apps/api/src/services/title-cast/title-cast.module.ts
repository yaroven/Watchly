import { Module } from "@nestjs/common";
import { ImageModule } from "../image/image.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TitleCastService } from "./title-cast.service";

@Module({
  imports: [PrismaModule, ImageModule],
  providers: [TitleCastService],
  exports: [TitleCastService],
})
export class TitleCastModule {}
