import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GenreController } from "./genre.controller";
import { GenreService } from "./genre.service";
import { GenreExistsPipe } from "./utils/genre-exists.pipe";

@Module({
  imports: [PrismaModule],
  controllers: [GenreController],
  providers: [GenreService, GenreExistsPipe],
  exports: [GenreService],
})
export class GenreModule {}
