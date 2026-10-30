import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertGenreExists from "./assert-genre-exists.util";

@Injectable()
export class GenreExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertGenreExists(this.prisma, id);
    return id;
  }
}
