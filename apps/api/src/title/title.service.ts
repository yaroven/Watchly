import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ExternalRatings, Genre, Prisma, Title, TitleType } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { SeasonService } from "../season/season.service";
import {
  TitleEngagementDto,
  ViewerTitleEngagementDto,
} from "../title-engagement/dto/response/title-engagement.dto";
import { TitleEngagementService } from "../title-engagement/title-engagement.service";
import { TitleRatingService } from "../title-rating/title-rating.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { CastCreditInputDto } from "./dto/request/set-title-cast.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly seasonService: SeasonService,
    private readonly mediaAssetService: MediaAssetService,
    private readonly titleRatingService: TitleRatingService,
    private readonly titleEngagementService: TitleEngagementService,
  ) {}

  async create(data: CreateTitleDto): Promise<TitleResponseDto> {
    const { genreIds, ...rest } = data;

    try {
      const title = await this.prisma.title.create({
        data: {
          ...rest,
          releaseDate: new Date(rest.releaseDate),
          genres: genreIds?.length ? { connect: genreIds.map((id) => ({ id })) } : undefined,
        },
        include: { genres: true, externalRatings: true },
      });
      // Nothing has been rated or reacted to yet, and the admin creating it
      // provably has no vote on it — that is known, not unknown.
      return new TitleResponseDto(
        title,
        { average: null, count: 0 },
        TitleEngagementDto.empty(new ViewerTitleEngagementDto(null, false)),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  async findAll(
    { page = 1, limit = 10 }: GetAllTitleDto,
    sort?: Sorting,
    filters: Filter[] = [],
    viewerId?: string,
  ): Promise<{ items: TitleResponseDto[]; totalCount: number }> {
    const genreFilters = filters.filter((filter) => filter.property === "genres");
    const scalarFilters = filters.filter((filter) => filter.property !== "genres");

    const where = buildWhere(scalarFilters) as Prisma.TitleWhereInput;
    if (genreFilters.length) {
      const genreIds = genreFilters.flatMap((filter) =>
        filter.rule === FilterRule.IN ? filter.value.split(",") : [filter.value],
      );
      where.genres = { some: { id: { in: genreIds } } };
    }
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.TitleOrderByWithRelationInput;

    const { items, totalCount } = await paginate<
      Title & { genres: Genre[]; externalRatings: ExternalRatings[] }
    >(this.prisma.title, {
      where,
      orderBy,
      page,
      limit,
      extra: { include: { genres: true, externalRatings: true } },
    });

    const ids = items.map((title) => title.id);
    const [ratings, engagement] = await Promise.all([
      this.titleRatingService.summarizeMany(ids),
      this.titleEngagementService.summarizeMany(ids, viewerId ?? null),
    ]);

    return {
      items: items.map((title) => this.toResponse(title, ratings, engagement)),
      totalCount,
    };
  }

  /// Newest addition first. The ordering lives in the id list and nowhere else:
  /// `findMany({ id: { in: ids } })` returns rows in whatever order the database
  /// finds convenient, so the rows are re-sorted back onto `titleIds` below.
  async findWatchlist(
    viewerId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ): Promise<{ items: TitleResponseDto[]; totalCount: number }> {
    const { titleIds, totalCount } = await this.titleEngagementService.findWatchlistTitleIds(
      viewerId,
      { page, limit },
    );
    if (titleIds.length === 0) return { items: [], totalCount };

    const [titles, ratings, engagement] = await Promise.all([
      this.prisma.title.findMany({
        where: { id: { in: titleIds } },
        include: { genres: true, externalRatings: true },
      }),
      this.titleRatingService.summarizeMany(titleIds),
      this.titleEngagementService.summarizeMany(titleIds, viewerId),
    ]);

    const byId = new Map(titles.map((title) => [title.id, title]));

    // The ids were already filtered through `title`, so a gap here means a row
    // vanished between the two queries — rare, and not something to paper over
    // with a short page and an unchanged count.
    const missing = titleIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      this.logger.error(
        `Watchlist of user ${viewerId} references titles that no longer exist: ${missing.join(", ")}`,
      );
    }

    return {
      items: titleIds
        .map((id) => byId.get(id))
        .filter((title): title is (typeof titles)[number] => Boolean(title))
        .map((title) => this.toResponse(title, ratings, engagement)),
      totalCount: totalCount - missing.length,
    };
  }

  async findOne(id: string, viewerId?: string): Promise<TitleResponseDto | null> {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: { genres: true, externalRatings: true },
    });
    if (!title) return null;

    const [{ average, count }, engagement] = await Promise.all([
      this.titleRatingService.summarize(id, viewerId ?? null),
      this.titleEngagementService.summarize(id, viewerId ?? null),
    ]);
    return new TitleResponseDto(title, { average, count }, engagement);
  }

  async update(id: string, data: UpdateTitleDto, viewerId?: string): Promise<TitleResponseDto> {
    await this.assertExists(id);
    if (data.posterUrl !== undefined) {
      await this.posterService.assertManagedPosterUrl("titles", id, data.posterUrl);
    }

    const { genreIds, ...rest } = data;

    try {
      const updated = await this.prisma.title.update({
        where: { id },
        data: {
          ...rest,
          // A partial update may omit it; `new Date(undefined)` is an Invalid
          // Date, which Prisma rejects.
          ...(rest.releaseDate !== undefined ? { releaseDate: new Date(rest.releaseDate) } : {}),
          genres:
            genreIds !== undefined
              ? { set: genreIds.map((genreId) => ({ id: genreId })) }
              : undefined,
        },
        include: { genres: true, externalRatings: true },
      });

      const [rating, engagement] = await Promise.all([
        this.titleRatingService.summarize(id, viewerId ?? null),
        this.titleEngagementService.summarize(id, viewerId ?? null),
      ]);
      return new TitleResponseDto(updated, rating, engagement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  async startMovieUpload(id: string, fileSize: number) {
    await this.assertExists(id);
    return this.mediaAssetService.startUpload(id, fileSize);
  }

  async completeMovieUpload(
    id: string,
    uploadId: string,
    parts: MultipartUploadPart[],
  ): Promise<void> {
    await this.assertExists(id);
    await this.mediaAssetService.completeUpload(id, uploadId, parts, VideoType.MOVIE);
  }

  async abortMovieUpload(id: string, uploadId: string): Promise<void> {
    await this.mediaAssetService.abortUpload(id, uploadId);
  }

  async createPosterUploadingUrl(id: string): Promise<{ uploadUrl: string; posterUrl: string }> {
    await this.assertExists(id);

    return this.posterService.createUploadUrl("titles", id);
  }

  async transcode(id: string): Promise<void> {
    await this.assertExists(id);

    await this.mediaAssetService.scheduleTranscode(id, VideoType.MOVIE);
  }

  async getMovieUrl(id: string): Promise<{ url: string }> {
    const url = await this.mediaAssetService.getReadUrl(`videos/${id}/master.m3u8`);
    if (!url) {
      throw new NotFoundException(`No media for title ${id}`);
    }
    return url;
  }

  async delete(id: string): Promise<TitleResponseDto> {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: {
        seasons: { include: { episodes: true } },
      },
    });

    if (!title) {
      throw new NotFoundException(`Title with id ${id} not found`);
    }

    const deleted = await this.prisma.title.delete({ where: { id }, include: { genres: true } });

    await Promise.all([
      this.posterService
        .deletePoster("titles", id)
        .catch((error: unknown) =>
          this.logger.error(`Failed to clean up poster after deleting title ${id}`, error),
        ),
      this.mediaAssetService.cleanupVideoAsset(id, VideoType.MOVIE, `videos/${id}/`),
      title.type === TitleType.SERIES &&
        settleAllOrLog(
          title.seasons,
          (season) => this.seasonService.cleanupAssets(season),
          (season) => season.id,
          this.logger,
          { itemLabel: "season", parentLabel: "title", parentId: id },
        ),
    ]);

    // The row is gone and its ratings/reactions/watchlist entries cascaded with it,
    // so nobody has any state on it, the caller included.
    return new TitleResponseDto(
      deleted,
      { average: null, count: 0 },
      TitleEngagementDto.empty(new ViewerTitleEngagementDto(null, false)),
    );
  }

  async getCast(id: string): Promise<CastCreditResponseDto[]> {
    await this.assertExists(id);

    const credits = await this.prisma.castCredit.findMany({
      where: { titleId: id },
      include: { artist: true },
      orderBy: { order: "asc" },
    });

    return credits.map((credit) => new CastCreditResponseDto(credit));
  }

  async setCast(id: string, credits: CastCreditInputDto[]): Promise<CastCreditResponseDto[]> {
    await this.assertExists(id);

    try {
      await this.prisma.$transaction([
        this.prisma.castCredit.deleteMany({ where: { titleId: id } }),
        this.prisma.castCredit.createMany({
          data: credits.map((credit, index) => ({
            titleId: id,
            artistId: credit.artistId,
            character: credit.character,
            order: credit.order ?? index,
          })),
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("One or more artistId values do not exist");
      }
      throw error;
    }

    return this.getCast(id);
  }

  /**
   * Existence only. `findOne` builds a whole response — two aggregate round trips
   * since this phase — and every caller here threw it away.
   */
  private async assertExists(id: string): Promise<void> {
    const title = await this.prisma.title.findUnique({ where: { id }, select: { id: true } });
    if (!title) throw new NotFoundException(`Title with id ${id} not found`);
  }

  /**
   * Both aggregate maps answer for every id they were given, so a miss here is a
   * broken invariant rather than "nothing to report" — serialising it as zeroes
   * would be indistinguishable from a title nobody has touched.
   */
  private toResponse(
    title: Title & { genres: Genre[]; externalRatings: ExternalRatings[] },
    ratings: Map<string, { average: number | null; count: number }>,
    engagement: Map<string, TitleEngagementDto>,
  ): TitleResponseDto {
    const rating = ratings.get(title.id);
    const titleEngagement = engagement.get(title.id);
    if (!rating || !titleEngagement) {
      // Logged, then thrown bare: Nest's default filter does not log HttpExceptions,
      // and the invariant text and row id are not the client's business. This is
      // mapped over every row of a list, so one bad title fails the whole page.
      this.logger.error(
        `No ${!rating ? "rating" : "engagement"} aggregate was built for title ${title.id}`,
      );
      throw new InternalServerErrorException();
    }
    return new TitleResponseDto(title, rating, titleEngagement);
  }
}
