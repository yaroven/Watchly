import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertSeasonExists from "./assert-season-exists.util";

@Injectable()
export class SeasonExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertSeasonExists(this.prisma, id);
    return id;
  }
}
