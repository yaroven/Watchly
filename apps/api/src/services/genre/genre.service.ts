import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BASE_LOCALE, Locale, TranslationLocale } from "../../common/locale.const";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { NameTranslation, TranslationView } from "../../common/translation.types";
import { translationsInclude } from "../../common/utils/localize.util";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { toGenreView } from "./genre.mapper";
import { GenreInput, GenreView, GenreWithTranslations } from "./genre.types";

@Injectable()
export class GenreService {
  constructor(private readonly prisma: PrismaService) {}

  @Logged()
  async create(data: GenreInput): Promise<GenreView> {
    try {
      const genre = await this.prisma.genre.create({ data });
      return toGenreView(genre, BASE_LOCALE);
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
    locale: Locale,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: GenreView[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.GenreWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.GenreOrderByWithRelationInput;

    const { items, totalCount } = await paginate<GenreWithTranslations>(this.prisma.genre, {
      where,
      orderBy,
      page,
      limit,
      extra: {
        include: { _count: { select: { titles: true } }, ...translationsInclude(locale) },
      },
    });

    return { items: items.map((genre) => toGenreView(genre, locale)), totalCount };
  }

  @Logged()
  async findOne(id: string, locale: Locale): Promise<GenreView | null> {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
      include: { _count: { select: { titles: true } }, ...translationsInclude(locale) },
    });
    return genre ? toGenreView(genre, locale) : null;
  }

  @Logged()
  async update(id: string, data: GenreInput): Promise<GenreView> {
    try {
      const updated = await this.prisma.genre.update({ where: { id }, data });
      return toGenreView(updated, BASE_LOCALE);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Genre with name ${data.name} already exists`);
      }
      throw error;
    }
  }

  @Logged()
  async delete(id: string): Promise<GenreView> {
    const genre = await this.findOne(id, BASE_LOCALE);
    if (!genre) {
      throw new NotFoundException(`Genre with id ${id} not found`);
    }
    if (genre.titleCount) {
      throw new BadRequestException(
        `Genre "${genre.name}" is still assigned to ${genre.titleCount} title(s) — remove it from every title first`,
      );
    }

    const deleted = await this.prisma.genre.delete({ where: { id } });
    return toGenreView(deleted, BASE_LOCALE);
  }

  @Logged()
  async listTranslations(genreId: string): Promise<TranslationView<NameTranslation>[]> {
    const rows = await this.prisma.genreTranslation.findMany({
      where: { genreId },
      orderBy: { locale: "asc" },
      select: { locale: true, name: true },
    });
    return rows as TranslationView<NameTranslation>[];
  }

  @Logged()
  async upsertTranslation(
    genreId: string,
    locale: TranslationLocale,
    data: NameTranslation,
  ): Promise<TranslationView<NameTranslation>> {
    try {
      const row = await this.prisma.genreTranslation.upsert({
        where: { genreId_locale: { genreId, locale } },
        create: { genreId, locale, name: data.name },
        update: { name: data.name },
        select: { locale: true, name: true },
      });
      return row as TranslationView<NameTranslation>;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Genre with name ${data.name} already exists`);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException(`Genre with id ${genreId} not found`);
      }
      throw error;
    }
  }

  @Logged()
  async removeTranslation(genreId: string, locale: TranslationLocale): Promise<void> {
    await this.prisma.genreTranslation.deleteMany({ where: { genreId, locale } });
  }
}
