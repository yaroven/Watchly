import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GenreService } from "./genre.service";

@Module({
  imports: [PrismaModule],
  providers: [GenreService],
  exports: [GenreService],
})
export class GenreModule {}
