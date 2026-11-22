import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BASE_LOCALE, Locale, TranslationLocale } from "../../common/locale.const";
import { Filter, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { NameDescriptionTranslation, TranslationView } from "../../common/translation.types";
import { translationsQuery } from "../../common/utils/localize.util";
import { Logged } from "../../decorators/logged.decorator";
import { ImageService } from "../image/image.service";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { toSeasonView } from "./season.mapper";
import { SeasonInput, SeasonView, SeasonWithTranslations } from "./season.types";

@Injectable()
export class SeasonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  private toView(season: SeasonWithTranslations, locale: Locale): SeasonView {
    return toSeasonView(season, this.imageService.toPublicUrl(season.posterKey), locale);
  }

  @Logged()
  async create(data: SeasonInput): Promise<SeasonView> {
    try {
      const season = await this.prisma.season.create({ data });
      return this.toView(season, BASE_LOCALE);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException(`Title with id ${data.titleId} not found`);
      }
      throw error;
    }
  }

  @Logged()
  async findAll(locale: Locale, filters: Filter[] = [], sort?: Sorting): Promise<SeasonView[]> {
    const where = buildWhere(filters) as Prisma.SeasonWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      number: "asc",
    }) as Prisma.SeasonOrderByWithRelationInput;

    const seasons = await this.prisma.season.findMany({
      where,
      orderBy,
      ...translationsQuery(locale),
    });
    return seasons.map((season) => this.toView(season, locale));
  }

  @Logged()
  async findOne(id: string, locale: Locale): Promise<SeasonView | null> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      ...translationsQuery(locale),
    });
    return season ? this.toView(season, locale) : null;
  }

  @Logged()
  async update(id: string, data: SeasonInput): Promise<SeasonView> {
    const updated = await this.prisma.season.update({ where: { id }, data });
    return this.toView(updated, BASE_LOCALE);
  }

  @Logged()
  async delete(id: string): Promise<SeasonView> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: { episodes: true },
    });

    if (!season) {
      throw new NotFoundException(`Season with id ${id} not found`);
    }

    const deleted = await this.prisma.season.delete({ where: { id } });
    await this.mediaAssetService.cleanupSeason(season);

    return this.toView(deleted, BASE_LOCALE);
  }

  @Logged()
  async listTranslations(seasonId: string): Promise<TranslationView<NameDescriptionTranslation>[]> {
    const rows = await this.prisma.seasonTranslation.findMany({
      where: { seasonId },
      orderBy: { locale: "asc" },
      select: { locale: true, name: true, description: true },
    });
    return rows as TranslationView<NameDescriptionTranslation>[];
  }

  @Logged()
  async upsertTranslation(
    seasonId: string,
    locale: TranslationLocale,
    data: NameDescriptionTranslation,
  ): Promise<TranslationView<NameDescriptionTranslation>> {
    try {
      const row = await this.prisma.seasonTranslation.upsert({
        where: { seasonId_locale: { seasonId, locale } },
        create: { seasonId, locale, name: data.name, description: data.description },
        update: { name: data.name, description: data.description },
        select: { locale: true, name: true, description: true },
      });
      return row as TranslationView<NameDescriptionTranslation>;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException(`Season with id ${seasonId} not found`);
      }
      throw error;
    }
  }

  @Logged()
  async removeTranslation(seasonId: string, locale: TranslationLocale): Promise<void> {
    await this.prisma.seasonTranslation.deleteMany({ where: { seasonId, locale } });
  }
}
