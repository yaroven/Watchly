import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateArtistDto } from "./dto/request/create-artist.dto";
import { GetAllArtistDto } from "./dto/request/get-all-artist.dto";
import { UpdateArtistDto } from "./dto/request/update-artist.dto";
import { ArtistResponseDto } from "./dto/response/artist-response.dto";

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateArtistDto): Promise<ArtistResponseDto> {
    const artist = await this.prisma.artist.create({ data });
    return new ArtistResponseDto(artist);
  }

  async findAll({
    search,
    page = 1,
    limit = 10,
    sort,
    sortBy,
  }: GetAllArtistDto): Promise<{ items: ArtistResponseDto[]; totalCount: number }> {
    const where: Prisma.ArtistWhereInput = {};
    const orderBy: Prisma.ArtistOrderByWithRelationInput = {};

    if (sortBy && Object.keys(Prisma.ArtistScalarFieldEnum).includes(sortBy)) {
      orderBy[sortBy] = sort || "desc";
    } else {
      orderBy["createdAt"] = "desc";
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.artist.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy }),
      this.prisma.artist.count({ where }),
    ]);

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

    const updated = await this.prisma.artist.update({ where: { id }, data });
    return new ArtistResponseDto(updated);
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
