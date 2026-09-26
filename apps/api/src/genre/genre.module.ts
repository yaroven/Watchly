import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GenreController } from "./genre.controller";
import { GenreService } from "./genre.service";

@Module({
  imports: [PrismaModule],
  controllers: [GenreController],
  providers: [GenreService],
  exports: [GenreService],
})
export class GenreModule {}
