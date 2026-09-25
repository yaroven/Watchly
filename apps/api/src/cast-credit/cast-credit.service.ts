import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CastCreditInputDto } from "./dto/request/set-title-cast.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";

@Injectable()
export class CastCreditService {
  constructor(private readonly prisma: PrismaService) {}

  async getCast(titleId: string): Promise<CastCreditResponseDto[]> {
    await this.assertTitleExists(titleId);

    const credits = await this.prisma.castCredit.findMany({
      where: { titleId },
      include: { artist: true },
      orderBy: { order: "asc" },
    });

    return credits.map((credit) => new CastCreditResponseDto(credit));
  }

  async setCast(titleId: string, credits: CastCreditInputDto[]): Promise<CastCreditResponseDto[]> {
    await this.assertTitleExists(titleId);

    try {
      await this.prisma.$transaction([
        this.prisma.castCredit.deleteMany({ where: { titleId } }),
        this.prisma.castCredit.createMany({
          data: credits.map((credit, index) => ({
            titleId,
            artistId: credit.artistId,
            character: credit.character,
            order: credit.order ?? index,
          })),
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("One or more artistId values do not exist");
      }
      throw error;
    }

    return this.getCast(titleId);
  }

  private async assertTitleExists(titleId: string): Promise<void> {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      select: { id: true },
    });
    if (!title) {
      throw new BadRequestException(`Title with id ${titleId} not found`);
    }
  }
}
