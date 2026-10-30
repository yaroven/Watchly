import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertEpisodeExists from "./assert-episode-exists.util";

@Injectable()
export class EpisodeExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertEpisodeExists(this.prisma, id);
    return id;
  }
}
