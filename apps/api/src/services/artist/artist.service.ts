import { Injectable } from "@nestjs/common";
import { Artist, Prisma } from "@prisma/client";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { toArtistFilmographyItemView, toArtistView } from "./artist.mapper";
import { ArtistFilmographyItemView, ArtistInput, ArtistView } from "./artist.types";

@Injectable()
export class ArtistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
  ) {}

  async create(data: ArtistInput): Promise<ArtistView> {
    const { photoUploaded: _photoUploaded, ...rest } = data;
    const artist = await this.prisma.artist.create({ data: rest });
    return this.toView(artist);
  }

  private toView(artist: Artist): ArtistView {
    return toArtistView(artist, this.posterService.toPublicUrl(artist.photoKey));
  }

  async findAll(
    { page = 1, limit = 10 }: PageQuery,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: ArtistView[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.ArtistWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.ArtistOrderByWithRelationInput;

    const { items, totalCount } = await paginate<Artist>(this.prisma.artist, {
      where,
      orderBy,
      page,
      limit,
    });

    return { items: items.map((artist) => this.toView(artist)), totalCount };
  }

  async findOne(id: string): Promise<ArtistView | null> {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    return artist ? this.toView(artist) : null;
  }

  async update(id: string, data: ArtistInput): Promise<ArtistView> {
    const { photoUploaded, ...rest } = data;

    if (photoUploaded === false) {
      await this.posterService.removeStoredImage("artists", id);
    }

    const updated = await this.prisma.artist.update({
      where: { id },
      data: {
        ...rest,
        ...(photoUploaded === false ? { photoKey: null } : {}),
      },
    });
    return this.toView(updated);
  }

  async getFilmography(id: string): Promise<ArtistFilmographyItemView[]> {
    const credits = await this.prisma.castCredit.findMany({
      where: { artistId: id },
      include: { title: true },
      orderBy: { title: { releaseDate: "desc" } },
    });
    return credits.map((credit) =>
      toArtistFilmographyItemView(credit, this.posterService.toPublicUrl(credit.title.posterKey)),
    );
  }

  async delete(id: string): Promise<ArtistView> {
    const deleted = await this.prisma.artist.delete({ where: { id } });

    await this.posterService.deleteStoredImage(deleted.photoKey);

    return toArtistView(deleted);
  }
}
