import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertArtistExists from "./assert-artist-exists.util";

@Injectable()
export class ArtistExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertArtistExists(this.prisma, id);
    return id;
  }
}
