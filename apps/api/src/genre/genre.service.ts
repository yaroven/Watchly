import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGenreDto } from "./dto/request/create-genre.dto";
import { GetAllGenreDto } from "./dto/request/get-all-genre.dto";
import { UpdateGenreDto } from "./dto/request/update-genre.dto";
import { GenreResponseDto } from "./dto/response/genre-response.dto";

@Injectable()
export class GenreService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateGenreDto): Promise<GenreResponseDto> {
    try {
      const genre = await this.prisma.genre.create({ data });
      return new GenreResponseDto(genre);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Genre with name ${data.name} already exists`);
      }
      throw error;
    }
  }

  async findAll(
    { page = 1, limit = 10 }: GetAllGenreDto,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: GenreResponseDto[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.GenreWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.GenreOrderByWithRelationInput;

    const [items, totalCount] = await Promise.all([
      this.prisma.genre.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy }),
      this.prisma.genre.count({ where }),
    ]);

    return { items: items.map((genre) => new GenreResponseDto(genre)), totalCount };
  }

  async findOne(id: string): Promise<GenreResponseDto | null> {
    const genre = await this.prisma.genre.findUnique({ where: { id } });
    return genre ? new GenreResponseDto(genre) : null;
  }

  async update(id: string, data: UpdateGenreDto): Promise<GenreResponseDto> {
    const genre = await this.findOne(id);
    if (!genre) {
      throw new BadRequestException(`Genre with id ${id} not found`);
    }

    try {
      const updated = await this.prisma.genre.update({ where: { id }, data });
      return new GenreResponseDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Genre with name ${data.name} already exists`);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<GenreResponseDto> {
    const genre = await this.findOne(id);
    if (!genre) {
      throw new BadRequestException(`Genre with id ${id} not found`);
    }

    const deleted = await this.prisma.genre.delete({ where: { id } });
    return new GenreResponseDto(deleted);
  }
}
