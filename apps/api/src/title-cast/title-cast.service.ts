import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { CastCreditInputDto } from "./dto/request/set-title-cast.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";
import titleCastQuery from "./utils/title-cast.query";

@Injectable()
export class TitleCastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
  ) {}

  async findForTitle(titleId: string): Promise<CastCreditResponseDto[]> {
    const credits = await this.prisma.castCredit.findMany(titleCastQuery.forTitle(titleId));

    return credits.map(
      (credit) =>
        new CastCreditResponseDto(credit, this.posterService.toPublicUrl(credit.artist.photoKey)),
    );
  }

  async replaceForTitle(
    titleId: string,
    credits: CastCreditInputDto[],
  ): Promise<CastCreditResponseDto[]> {
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

    return this.findForTitle(titleId);
  }
}
