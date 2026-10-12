import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertEpisodeExists from "./assert-episode-exists.util";

/**
 * The episode twin of `TitleExistsPipe`: 404s a route whose `:id` names no
 * episode, so a route that only forwards the id needs no service method to
 * wrap the check.
 */
@Injectable()
export class EpisodeExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertEpisodeExists(this.prisma, id);
    return id;
  }
}
