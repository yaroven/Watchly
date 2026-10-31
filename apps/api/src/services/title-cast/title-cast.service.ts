import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ImageService } from "../image/image.service";
import { PrismaService } from "../prisma/prisma.service";
import { toCastCreditView } from "./title-cast.mapper";
import { CastCreditInput, CastCreditView } from "./title-cast.types";
import titleCastQuery from "./utils/title-cast.query";

@Injectable()
export class TitleCastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
  ) {}

  async findForTitle(titleId: string): Promise<CastCreditView[]> {
    const credits = await this.prisma.castCredit.findMany(titleCastQuery.forTitle(titleId));

    return credits.map((credit) =>
      toCastCreditView(credit, this.imageService.toPublicUrl(credit.artist.photoKey)),
    );
  }

  async replaceForTitle(titleId: string, credits: CastCreditInput[]): Promise<CastCreditView[]> {
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
