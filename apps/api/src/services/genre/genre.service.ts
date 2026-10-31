import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Genre, Prisma } from "@prisma/client";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { toGenreView } from "./genre.mapper";
import { GenreInput, GenreView } from "./genre.types";

@Injectable()
export class GenreService {
  constructor(private readonly prisma: PrismaService) {}

  @Logged()
  async create(data: GenreInput): Promise<GenreView> {
    try {
      const genre = await this.prisma.genre.create({ data });
      return toGenreView(genre);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Genre with name ${data.name} already exists`);
      }
      throw error;
    }
  }

  @Logged()
  async findAll(
    { page = 1, limit = 10 }: PageQuery,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: GenreView[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.GenreWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.GenreOrderByWithRelationInput;

    const { items, totalCount } = await paginate<Genre & { _count: { titles: number } }>(
      this.prisma.genre,
      {
        where,
        orderBy,
        page,
        limit,
        extra: { include: { _count: { select: { titles: true } } } },
      },
    );

    return { items: items.map(toGenreView), totalCount };
  }

  @Logged()
  async findOne(id: string): Promise<GenreView | null> {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
      include: { _count: { select: { titles: true } } },
    });
    return genre ? toGenreView(genre) : null;
  }

  @Logged()
  async update(id: string, data: GenreInput): Promise<GenreView> {
    try {
      const updated = await this.prisma.genre.update({ where: { id }, data });
      return toGenreView(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Genre with name ${data.name} already exists`);
      }
      throw error;
    }
  }

  @Logged()
  async delete(id: string): Promise<GenreView> {
    const genre = await this.findOne(id);
    if (!genre) {
      throw new NotFoundException(`Genre with id ${id} not found`);
    }
    if (genre.titleCount) {
      throw new BadRequestException(
        `Genre "${genre.name}" is still assigned to ${genre.titleCount} title(s) — remove it from every title first`,
      );
    }

    const deleted = await this.prisma.genre.delete({ where: { id } });
    return toGenreView(deleted);
  }
}
