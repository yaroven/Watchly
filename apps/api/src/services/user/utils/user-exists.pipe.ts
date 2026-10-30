import { Injectable, PipeTransform } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import assertUserExists from "./assert-user-exists.util";

@Injectable()
export class UserExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(id: string): Promise<string> {
    await assertUserExists(this.prisma, id);
    return id;
  }
}
