import { Module } from "@nestjs/common";
import { GenreModule } from "../../../services/genre/genre.module";
import { GenreExistsPipe } from "../../../services/genre/utils/genre-exists.pipe";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { GenresController } from "./genres.controller";

@Module({
  imports: [GenreModule, PrismaModule],
  controllers: [GenresController],
  providers: [GenreExistsPipe],
})
export class GenresModule {}
