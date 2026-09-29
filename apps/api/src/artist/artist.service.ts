import { BadRequestException, Injectable } from "@nestjs/common";
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
    const artist = await this.prisma.artist.create({ data });
    return new ArtistResponseDto(artist);
  }

  async findAll(
    { page = 1, limit = 10 }: GetAllArtistDto,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: ArtistResponseDto[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.ArtistWhereInput;
    const orderBy = buildOrderBy(sort) as Prisma.ArtistOrderByWithRelationInput;

    const { items, totalCount } = await paginate<Artist>(this.prisma.artist, {
      where,
      orderBy,
      page,
      limit,
    });

    return { items: items.map((artist) => new ArtistResponseDto(artist)), totalCount };
  }

  async findOne(id: string): Promise<ArtistResponseDto | null> {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    return artist ? new ArtistResponseDto(artist) : null;
  }

  async update(id: string, data: UpdateArtistDto): Promise<ArtistResponseDto> {
    const artist = await this.findOne(id);
    if (!artist) {
      throw new BadRequestException(`Artist with id ${id} not found`);
    }
    if (data.photoUrl !== undefined) {
      await this.posterService.assertManagedPosterUrl("artists", id, data.photoUrl);
    }

    const updated = await this.prisma.artist.update({ where: { id }, data });
    return new ArtistResponseDto(updated);
  }

  async createPhotoUploadUrl(id: string): Promise<{ uploadUrl: string; posterUrl: string }> {
    const artist = await this.findOne(id);
    if (!artist) {
      throw new BadRequestException(`Artist with id ${id} not found`);
    }
    return this.posterService.createUploadUrl("artists", id);
  }

  async getFilmography(id: string): Promise<ArtistFilmographyItemDto[]> {
    const credits = await this.prisma.castCredit.findMany({
      where: { artistId: id },
      include: { title: true },
      orderBy: { title: { releaseDate: "desc" } },
    });
    return credits.map((credit) => new ArtistFilmographyItemDto(credit));
  }

  async delete(id: string): Promise<ArtistResponseDto> {
    const artist = await this.findOne(id);
    if (!artist) {
      throw new BadRequestException(`Artist with id ${id} not found`);
    }

    const deleted = await this.prisma.artist.delete({ where: { id } });
    return new ArtistResponseDto(deleted);
  }
}
