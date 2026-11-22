import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BASE_LOCALE, Locale, TranslationLocale } from "../../common/locale.const";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy } from "../../common/pagination/prisma-query.util";
import { NameDescriptionTranslation, TranslationView } from "../../common/translation.types";
import { Logged } from "../../decorators/logged.decorator";
import { ImageService } from "../image/image.service";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { titleEngagementViewFromRelations, withoutVote } from "./title-engagement.mapper";
import { titleViewWithoutEngagement, toTitleView } from "./title.mapper";
import { CardTitleView, StoredTitleView, TitleInput, TitleView } from "./title.types";
import assertTitleExists from "./utils/assert-title-exists.util";
import { buildTitleWhere } from "./utils/title-filter.query";
import titleQuery, { TitleWithEngagement } from "./utils/title.query";

@Injectable()
export class TitleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  private toView(
    title: TitleWithEngagement,
    viewerId: string | null,
    locale: Locale,
  ): StoredTitleView {
    return toTitleView(
      title,
      titleEngagementViewFromRelations(title, viewerId),
      this.imageService.toPublicUrl(title.posterKey),
      locale,
    );
  }

  @Logged()
  async create({ genreIds, ...rest }: TitleInput): Promise<TitleView> {
    try {
      const title = await this.prisma.title.create({
        data: {
          ...rest,
          genres: genreIds?.length ? { connect: genreIds.map((id) => ({ id })) } : undefined,
        },
        include: titleQuery.base(BASE_LOCALE),
      });
      return titleViewWithoutEngagement(title);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new BadRequestException("One or more genreIds do not exist");
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
    viewerId?: string,
  ): Promise<{ items: StoredTitleView[]; totalCount: number }> {
    const where = buildTitleWhere(filters);
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.TitleOrderByWithRelationInput;

    const { items, totalCount } = await paginate<TitleWithEngagement>(this.prisma.title, {
      where,
      orderBy,
      page,
      limit,
      extra: { include: titleQuery.withEngagement(viewerId ?? null, locale) },
    });

    return {
      items: items.map((title) => this.toView(title, viewerId ?? null, locale)),
      totalCount,
    };
  }

  @Logged()
  async findOne(id: string, locale: Locale, viewerId?: string): Promise<StoredTitleView | null> {
    const title = (await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.withEngagement(viewerId ?? null, locale),
    })) as TitleWithEngagement | null;
    if (!title) return null;

    return this.toView(title, viewerId ?? null, locale);
  }

  @Logged()
  async update(
    id: string,
    { genreIds, ...rest }: TitleInput,
    viewerId?: string,
  ): Promise<StoredTitleView> {
    await assertTitleExists(this.prisma, id);

    try {
      const updated = (await this.prisma.title.update({
        where: { id },
        data: {
          ...rest,
          genres:
            genreIds !== undefined
              ? { set: genreIds.map((genreId) => ({ id: genreId })) }
              : undefined,
        },
        include: titleQuery.withEngagement(viewerId ?? null, BASE_LOCALE),
      })) as TitleWithEngagement;

      return this.toView(updated, viewerId ?? null, BASE_LOCALE);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        await assertTitleExists(this.prisma, id);
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  @Logged()
  async delete(id: string): Promise<TitleView> {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.assets(),
    });

    if (!title) {
      throw new NotFoundException(`Title with id ${id} not found`);
    }

    const deleted = await this.prisma.title.delete({
      where: { id },
      include: titleQuery.deleted(),
    });

    await this.mediaAssetService.cleanupTitle(title);

    return titleViewWithoutEngagement(deleted);
  }

  @Logged()
  async findManyByIds(
    titleIds: string[],
    viewerId: string | null,
    locale: Locale,
  ): Promise<CardTitleView[]> {
    if (titleIds.length === 0) return [];

    const titles = (await this.prisma.title.findMany({
      where: { id: { in: titleIds } },
      include: titleQuery.withEngagement(viewerId, locale),
    })) as TitleWithEngagement[];

    return titles.map((title) => {
      const view = this.toView(title, viewerId, locale);
      return { ...view, engagement: withoutVote(view.engagement) };
    });
  }

  @Logged()
  async listTranslations(titleId: string): Promise<TranslationView<NameDescriptionTranslation>[]> {
    const rows = await this.prisma.titleTranslation.findMany({
      where: { titleId },
      orderBy: { locale: "asc" },
      select: { locale: true, name: true, description: true },
    });
    return rows as TranslationView<NameDescriptionTranslation>[];
  }

  @Logged()
  async upsertTranslation(
    titleId: string,
    locale: TranslationLocale,
    data: NameDescriptionTranslation,
  ): Promise<TranslationView<NameDescriptionTranslation>> {
    try {
      const row = await this.prisma.titleTranslation.upsert({
        where: { titleId_locale: { titleId, locale } },
        create: { titleId, locale, name: data.name, description: data.description },
        update: { name: data.name, description: data.description },
        select: { locale: true, name: true, description: true },
      });
      return row as TranslationView<NameDescriptionTranslation>;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException(`Title with id ${titleId} not found`);
      }
      throw error;
    }
  }

  @Logged()
  async removeTranslation(titleId: string, locale: TranslationLocale): Promise<void> {
    await this.prisma.titleTranslation.deleteMany({ where: { titleId, locale } });
  }
}
