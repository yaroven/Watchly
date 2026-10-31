import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { TitleCastModule } from "../../../services/title-cast/title-cast.module";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { TitleCastController } from "./title-cast.controller";

@Module({
  imports: [TitleCastModule, PrismaModule],
  controllers: [TitleCastController],
  providers: [TitleExistsPipe],
})
export class TitleCastEndpointModule {}
