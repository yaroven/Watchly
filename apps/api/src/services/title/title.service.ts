import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy } from "../../common/pagination/prisma-query.util";
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

  private toView(title: TitleWithEngagement, viewerId: string | null): StoredTitleView {
    return toTitleView(
      title,
      titleEngagementViewFromRelations(title, viewerId),
      this.imageService.toPublicUrl(title.posterKey),
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
        include: titleQuery.base(),
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
      extra: { include: titleQuery.withEngagement(viewerId ?? null) },
    });

    return {
      items: items.map((title) => this.toView(title, viewerId ?? null)),
      totalCount,
    };
  }

  @Logged()
  async findOne(id: string, viewerId?: string): Promise<StoredTitleView | null> {
    const title = (await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.withEngagement(viewerId ?? null),
    })) as TitleWithEngagement | null;
    if (!title) return null;

    return this.toView(title, viewerId ?? null);
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
        include: titleQuery.withEngagement(viewerId ?? null),
      })) as TitleWithEngagement;

      return this.toView(updated, viewerId ?? null);
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
  async findManyByIds(titleIds: string[], viewerId: string | null): Promise<CardTitleView[]> {
    if (titleIds.length === 0) return [];

    const titles = (await this.prisma.title.findMany({
      where: { id: { in: titleIds } },
      include: titleQuery.withEngagement(viewerId),
    })) as TitleWithEngagement[];

    return titles.map((title) => {
      const view = this.toView(title, viewerId);
      return { ...view, engagement: withoutVote(view.engagement) };
    });
  }
}
