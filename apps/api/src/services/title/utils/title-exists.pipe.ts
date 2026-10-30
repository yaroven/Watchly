import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertTitleExists from "./assert-title-exists.util";

@Injectable()
export class TitleExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertTitleExists(this.prisma, id);
    return id;
  }
}
