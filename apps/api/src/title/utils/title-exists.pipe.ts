import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertTitleExists from "./assert-title-exists.util";

/**
 * 404s a route whose `:id` names no title, before the handler runs.
 *
 * For a route that only forwards the id to another service this replaces the
 * check the service used to make, and with it the service method that existed
 * to make it. It is NOT a replacement for the in-transaction checks on the
 * engagement writes: a pipe runs before the handler, so a title deleted between
 * the pipe and the transaction would slip through.
 *
 * Pipes do not run on a direct handler call, so what pins this is
 * `media-asset.controller.spec.ts` (request-level) and the route-metadata sweep
 * in `title-media-pipe.spec.ts`, not a unit call.
 */
@Injectable()
export class TitleExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertTitleExists(this.prisma, id);
    return id;
  }
}
