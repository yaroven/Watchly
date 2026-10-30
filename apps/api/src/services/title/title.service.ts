import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, TitleType } from "@prisma/client";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy } from "../../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../../common/utils/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { buildVideoPrefix } from "../s3/processed-key";
import { SeasonService } from "../season/season.service";
import { titleEngagementViewFromRelations } from "../title-engagement/title-engagement.mapper";
import { NO_VOTE_OVERRIDES, VoteOverrides } from "../vote-cache/vote-cache.const";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { titleViewWithoutEngagement, toTitleView } from "./title.mapper";
import { TitleInput, TitleUpdate, TitleView } from "./title.types";
import assertTitleExists from "./utils/assert-title-exists.util";
import { buildTitleWhere } from "./utils/title-filter.query";
import titleQuery, { TitleWithEngagement } from "./utils/title.query";

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly seasonService: SeasonService,
    private readonly mediaAssetService: MediaAssetService,
    private readonly voteState: VoteStateService,
  ) {}

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

  async findAll(
    { page = 1, limit = 10 }: PageQuery,
    sort?: Sorting,
    filters: Filter[] = [],
    viewerId?: string,
  ): Promise<{ items: TitleView[]; totalCount: number }> {
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

    const votes = await this.voteState.forTitles(items, viewerId ?? null);

    return {
      items: items.map((title) => this.toView(title, viewerId ?? null, votes)),
      totalCount,
    };
  }

  async findOne(id: string, viewerId?: string): Promise<TitleView | null> {
    const title = (await this.prisma.title.findUnique({
      where: { id },
      include: titleQuery.withEngagement(viewerId ?? null),
    })) as TitleWithEngagement | null;
    if (!title) return null;

    return this.toView(
      title,
      viewerId ?? null,
      await this.voteState.forTitles([title], viewerId ?? null),
    );
  }

  async update(
    id: string,
    { genreIds, posterUploaded, ...rest }: TitleUpdate,
    viewerId?: string,
  ): Promise<TitleView> {
    await assertTitleExists(this.prisma, id);

    if (posterUploaded === false) {
      await this.posterService.removeStoredImage("titles", id);
    }
    const posterKey = posterUploaded === false ? null : undefined;

    try {
      const updated = (await this.prisma.title.update({
        where: { id },
        data: {
          ...rest,
          ...(posterKey !== undefined ? { posterKey } : {}),
          genres:
            genreIds !== undefined
              ? { set: genreIds.map((genreId) => ({ id: genreId })) }
              : undefined,
        },
        include: titleQuery.withEngagement(viewerId ?? null),
      })) as TitleWithEngagement;

      return this.toView(
        updated,
        viewerId ?? null,
        await this.voteState.forTitles([updated], viewerId ?? null),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        await assertTitleExists(this.prisma, id);
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

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

    await Promise.all([
      this.posterService.deleteStoredImage(title.posterKey),
      this.mediaAssetService.cleanupVideoAsset(
        id,
        VideoType.MOVIE,
        buildVideoPrefix({ type: VideoType.MOVIE, titleId: id }),
      ),
      title.type === TitleType.SERIES &&
        settleAllOrLog(
          title.seasons,
          (season) => this.seasonService.cleanupAssets(season),
          (season) => season.id,
          this.logger,
          { itemLabel: "season", parentLabel: "title", parentId: id },
        ),
    ]);

    return titleViewWithoutEngagement(deleted);
  }

  async findManyByIds(titleIds: string[], viewerId: string | null): Promise<TitleView[]> {
    if (titleIds.length === 0) return [];

    const titles = (await this.prisma.title.findMany({
      where: { id: { in: titleIds } },
      include: titleQuery.withEngagement(viewerId),
    })) as TitleWithEngagement[];

    const votes = await this.voteState.forTitles(titles, viewerId);

    return titles.map((title) => this.toView(title, viewerId, votes));
  }

  private toView(
    title: TitleWithEngagement,
    viewerId: string | null,
    votes: VoteOverrides = NO_VOTE_OVERRIDES,
  ): TitleView {
    return toTitleView(
      title,
      titleEngagementViewFromRelations(title, viewerId, votes.get(title.id)),
      this.posterService.toPublicUrl(title.posterKey),
    );
  }
}
