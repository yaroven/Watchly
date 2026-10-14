import { Injectable } from "@nestjs/common";
import { Artist, Prisma } from "@prisma/client";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateArtistDto } from "./dto/request/create-artist.dto";
import { GetAllArtistDto } from "./dto/request/get-all-artist.dto";
import { UpdateArtistDto } from "./dto/request/update-artist.dto";
import { ArtistFilmographyItemDto } from "./dto/response/artist-filmography-item.dto";
import { ArtistResponseDto } from "./dto/response/artist-response.dto";

@Injectable()
export class ArtistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
  ) {}

  async create(data: CreateArtistDto): Promise<ArtistResponseDto> {
    const { photoUploaded: _photoUploaded, ...rest } = data;
    const artist = await this.prisma.artist.create({ data: rest });
    return this.toResponse(artist);
  }

  private toResponse(artist: Artist): ArtistResponseDto {
    return new ArtistResponseDto(artist, this.posterService.toPublicUrl(artist.photoKey));
  }

  async findAll(
    { page = 1, limit = 10 }: GetAllArtistDto,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: ArtistResponseDto[]; totalCount: number }> {
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

    return { items: items.map((artist) => this.toResponse(artist)), totalCount };
  }

  async findOne(id: string): Promise<ArtistResponseDto | null> {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    return artist ? this.toResponse(artist) : null;
  }

  async update(id: string, data: UpdateArtistDto): Promise<ArtistResponseDto> {
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
    return this.toResponse(updated);
  }

  async getFilmography(id: string): Promise<ArtistFilmographyItemDto[]> {
    const credits = await this.prisma.castCredit.findMany({
      where: { artistId: id },
      include: { title: true },
      orderBy: { title: { releaseDate: "desc" } },
    });
    return credits.map(
      (credit) =>
        new ArtistFilmographyItemDto(
          credit,
          this.posterService.toPublicUrl(credit.title.posterKey),
        ),
    );
  }

  async delete(id: string): Promise<ArtistResponseDto> {
    const deleted = await this.prisma.artist.delete({ where: { id } });

    await this.posterService.deleteStoredImage(deleted.photoKey);

    return new ArtistResponseDto(deleted);
  }
}
