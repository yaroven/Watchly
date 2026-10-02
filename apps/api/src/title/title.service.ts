import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ExternalRatings, Genre, Prisma, ReactionType, Title, TitleType } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { settleAllOrLog } from "../common/settle-all-or-throw.util";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { MultipartUploadPart } from "../s3/multipart.constants";
import { buildVideoPrefix } from "../s3/processed-key";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { CastCreditInputDto } from "./dto/request/set-title-cast.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";
import {
  TitleEngagementCounts,
  TitleEngagementDto,
  ViewerTitleEngagementDto,
} from "./dto/response/title-engagement.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";

const EMPTY_ENGAGEMENT_COUNTS: TitleEngagementCounts = {
  averageScore: null,
  ratingCount: 0,
  likes: 0,
  dislikes: 0,
  watchlistCount: 0,
};

/** The slice of the Prisma client that both the service and a transaction expose. */
type EngagementClient = Pick<
  PrismaService,
  "title" | "titleRating" | "titleReaction" | "watchlistItem"
>;

@Injectable()
export class TitleService {
  private readonly logger = new Logger(TitleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posterService: PosterService,
    private readonly seasonService: SeasonService,
    private readonly mediaAssetService: MediaAssetService,
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
      // No poster yet: the key is derived from the id, which does not exist
      // until this row does, so there is nowhere to have uploaded one.
      return new TitleResponseDto(
        title,
        TitleEngagementDto.empty(new ViewerTitleEngagementDto(null, null, false)),
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

    const engagement = await this.summarizeEngagementMany(
      this.prisma,
      items.map((title) => title.id),
      viewerId ?? null,
    );

    return {
      items: items.map((title) => this.toResponse(title, engagement)),
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
    const { titleIds, totalCount } = await this.findWatchlistTitleIds(viewerId, { page, limit });
    if (titleIds.length === 0) return { items: [], totalCount };

    const [titles, engagement] = await Promise.all([
      this.prisma.title.findMany({
        where: { id: { in: titleIds } },
        include: { genres: true, externalRatings: true },
      }),
      this.summarizeEngagementMany(this.prisma, titleIds, viewerId),
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
        .map((title) => this.toResponse(title, engagement)),
      totalCount: totalCount - missing.length,
    };
  }

  async findOne(id: string, viewerId?: string): Promise<TitleResponseDto | null> {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: { genres: true, externalRatings: true },
    });
    if (!title) return null;

    return new TitleResponseDto(
      title,
      await this.summarizeEngagementWith(this.prisma, id, viewerId ?? null),
      this.posterService.toPublicUrl(title.posterKey),
    );
  }

  async update(id: string, data: UpdateTitleDto, viewerId?: string): Promise<TitleResponseDto> {
    await this.assertExists(id);
    const { genreIds, posterUploaded, ...rest } = data;

    // Resolved before the write, and outside the try: a missing upload is the
    // client's mistake (400), not one of the genre errors caught below.
    const posterKey =
      posterUploaded === undefined
        ? undefined
        : posterUploaded
          ? await this.posterService.confirmUpload("titles", id)
          : null;

    try {
      const updated = await this.prisma.title.update({
        where: { id },
        data: {
          ...rest,
          ...(posterKey !== undefined ? { posterKey } : {}),
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

      return new TitleResponseDto(
        updated,
        await this.summarizeEngagementWith(this.prisma, id, viewerId ?? null),
        this.posterService.toPublicUrl(updated.posterKey),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new BadRequestException("One or more genreIds do not exist");
      }
      throw error;
    }
  }

  async startMovieUpload(id: string, fileSize: number) {
    await this.assertExists(id);
    return this.mediaAssetService.startUpload(id, fileSize, VideoType.MOVIE);
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
    await this.mediaAssetService.abortUpload(id, uploadId, VideoType.MOVIE);
  }

  async createPosterUploadingUrl(id: string): Promise<{ uploadUrl: string }> {
    await this.assertExists(id);

    return this.posterService.createUploadUrl("titles", id);
  }

  async transcode(id: string): Promise<void> {
    await this.assertExists(id);

    await this.mediaAssetService.scheduleTranscode(id, VideoType.MOVIE);
  }

  async getMovieUrl(id: string): Promise<{ url: string }> {
    return this.mediaAssetService.getPlaybackUrl({ type: VideoType.MOVIE, titleId: id });
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

    // The row is gone and its ratings/reactions/watchlist entries cascaded with it,
    // so nobody has any state on it, the caller included.
    return new TitleResponseDto(
      deleted,
      TitleEngagementDto.empty(new ViewerTitleEngagementDto(null, null, false)),
    );
  }

  async getCast(id: string): Promise<CastCreditResponseDto[]> {
    await this.assertExists(id);

    const credits = await this.prisma.castCredit.findMany({
      where: { titleId: id },
      include: { artist: true },
      orderBy: { order: "asc" },
    });

    return credits.map(
      (credit) =>
        new CastCreditResponseDto(credit, this.posterService.toPublicUrl(credit.artist.photoKey)),
    );
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

  // ---------------------------------------------------------------------------
  // Engagement: score, reactions, watchlist.
  //
  // Three tables (ADR-0003) behind one aggregate, because every consumer that
  // wants any of them wants the rest. They used to be two modules with one
  // caller between them — this one — each densifying its own `groupBy` by hand
  // with the reasoning written out twice.
  // ---------------------------------------------------------------------------

  async rate(titleId: string, userId: string, score: number): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExistsWith(tx, titleId);

      await tx.titleRating.upsert({
        where: { titleId_userId: { titleId, userId } },
        create: { titleId, userId, score },
        update: { score },
      });

      return this.summarizeEngagementWith(tx, titleId, userId);
    });
  }

  async removeRating(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.titleRating.deleteMany({ where: { titleId, userId } });
      if (deleted.count === 0) {
        throw new NotFoundException("You have not rated this title");
      }

      return this.summarizeEngagementWith(tx, titleId, userId);
    });
  }

  /**
   * Sending the vote already cast withdraws it; the other one switches sides.
   *
   * The delete's row count answers "had they already cast this exact vote?" with no
   * separate read. The write and the summary read back from it share one transaction,
   * so a failure cannot leave the previous vote deleted with nothing in its place, and
   * the response can never describe a state that was not committed. Concurrent requests
   * for the same vote resolve last-writer-wins.
   */
  async react(titleId: string, userId: string, type: ReactionType): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExistsWith(tx, titleId);

      const { count: withdrawn } = await tx.titleReaction.deleteMany({
        where: { titleId, userId, type },
      });

      if (withdrawn === 0) {
        await tx.titleReaction.upsert({
          where: { titleId_userId: { titleId, userId } },
          create: { titleId, userId, type },
          update: { type },
        });
      }

      return this.summarizeEngagementWith(tx, titleId, userId);
    });
  }

  async removeReaction(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExistsWith(tx, titleId);
      await tx.titleReaction.deleteMany({ where: { titleId, userId } });
      return this.summarizeEngagementWith(tx, titleId, userId);
    });
  }

  async addToWatchlist(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExistsWith(tx, titleId);

      await tx.watchlistItem.upsert({
        where: { userId_titleId: { userId, titleId } },
        create: { userId, titleId },
        update: {},
      });

      return this.summarizeEngagementWith(tx, titleId, userId);
    });
  }

  async removeFromWatchlist(titleId: string, userId: string): Promise<TitleEngagementDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTitleExistsWith(tx, titleId);
      await tx.watchlistItem.deleteMany({ where: { userId, titleId } });
      return this.summarizeEngagementWith(tx, titleId, userId);
    });
  }

  /** `viewerId` is explicit even when there is none, so no caller omits it by accident. */
  async summarizeEngagement(titleId: string, viewerId: string | null): Promise<TitleEngagementDto> {
    // Zeroes for an id that does not exist would be a plausible-looking answer to
    // a question about nothing, and the write paths already 404 on it.
    await this.assertTitleExistsWith(this.prisma, titleId);
    return this.summarizeEngagementWith(this.prisma, titleId, viewerId);
  }

  private async summarizeEngagementWith(
    client: EngagementClient,
    titleId: string,
    viewerId: string | null,
  ): Promise<TitleEngagementDto> {
    const summaries = await this.summarizeEngagementMany(client, [titleId], viewerId);
    // summarizeEngagementMany builds one entry per requested id, so this cannot miss.
    return summaries.get(titleId)!;
  }

  /**
   * One entry per requested id, always.
   *
   * `groupBy` only answers for rows that exist, so the five aggregates below are
   * sparse and are densified once, here, before anyone sees them. `toResponse`
   * treats a miss as a broken invariant rather than as zero, which only works
   * because this is the single place that builds the map.
   */
  private async summarizeEngagementMany(
    client: EngagementClient,
    titleIds: string[],
    viewerId: string | null,
  ): Promise<Map<string, TitleEngagementDto>> {
    if (titleIds.length === 0) return new Map();

    const where = { titleId: { in: titleIds } };
    const forViewer = viewerId ? { userId: viewerId, titleId: { in: titleIds } } : null;

    const [scores, reactions, watchlisted, myScores, myReactions, myWatchlist] = await Promise.all([
      client.titleRating.groupBy({
        by: ["titleId"],
        where,
        _avg: { score: true },
        _count: { _all: true },
      }),
      client.titleReaction.groupBy({ by: ["titleId", "type"], where, _count: { _all: true } }),
      client.watchlistItem.groupBy({ by: ["titleId"], where, _count: { _all: true } }),
      forViewer
        ? client.titleRating.findMany({ where: forViewer, select: { titleId: true, score: true } })
        : Promise.resolve<{ titleId: string; score: number }[]>([]),
      forViewer
        ? client.titleReaction.findMany({ where: forViewer, select: { titleId: true, type: true } })
        : Promise.resolve<{ titleId: string; type: ReactionType }[]>([]),
      forViewer
        ? client.watchlistItem.findMany({ where: forViewer, select: { titleId: true } })
        : Promise.resolve<{ titleId: string }[]>([]),
    ]);

    const counts = new Map<string, TitleEngagementCounts>();
    const countsFor = (titleId: string) => {
      const current = counts.get(titleId) ?? { ...EMPTY_ENGAGEMENT_COUNTS };
      counts.set(titleId, current);
      return current;
    };

    for (const row of scores) {
      const current = countsFor(row.titleId);
      current.averageScore = row._avg.score;
      current.ratingCount = row._count._all;
    }
    for (const row of reactions) {
      const current = countsFor(row.titleId);
      if (row.type === ReactionType.LIKE) current.likes = row._count._all;
      else current.dislikes = row._count._all;
    }
    for (const row of watchlisted) {
      countsFor(row.titleId).watchlistCount = row._count._all;
    }

    const scoreByTitle = new Map(myScores.map((row) => [row.titleId, row.score] as const));
    const reactionByTitle = new Map(myReactions.map((row) => [row.titleId, row.type] as const));
    const inWatchlist = new Set(myWatchlist.map((row) => row.titleId));

    return new Map(
      titleIds.map((titleId) => [
        titleId,
        new TitleEngagementDto(
          counts.get(titleId) ?? EMPTY_ENGAGEMENT_COUNTS,
          viewerId
            ? new ViewerTitleEngagementDto(
                scoreByTitle.get(titleId) ?? null,
                reactionByTitle.get(titleId) ?? null,
                inWatchlist.has(titleId),
              )
            : null,
        ),
      ]),
    );
  }

  /**
   * Both the page and the count are filtered through `title`, so they agree with
   * each other. Counting rows the page cannot render makes the pager advertise
   * pages that come back short, and a count that only excluded the orphans on the
   * current page would change as the viewer pages through.
   */
  private async findWatchlistTitleIds(
    userId: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ): Promise<{ titleIds: string[]; totalCount: number }> {
    const where = { userId, title: { is: {} } };

    const [items, totalCount] = await Promise.all([
      this.prisma.watchlistItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { titleId: true },
      }),
      this.prisma.watchlistItem.count({ where }),
    ]);

    return { titleIds: items.map((item) => item.titleId), totalCount };
  }

  /** The transaction-aware twin of `assertExists`, for the engagement writes. */
  private async assertTitleExistsWith(client: EngagementClient, titleId: string): Promise<void> {
    const title = await client.title.findUnique({ where: { id: titleId }, select: { id: true } });
    if (!title) throw new NotFoundException(`Title with id ${titleId} not found`);
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
   * The aggregate map answers for every id it was given, so a miss here is a
   * broken invariant rather than "nothing to report" — serialising it as zeroes
   * would be indistinguishable from a title nobody has touched.
   */
  private toResponse(
    title: Title & { genres: Genre[]; externalRatings: ExternalRatings[] },
    engagement: Map<string, TitleEngagementDto>,
  ): TitleResponseDto {
    const titleEngagement = engagement.get(title.id);
    if (!titleEngagement) {
      // Logged, then thrown bare: Nest's default filter does not log HttpExceptions,
      // and the invariant text and row id are not the client's business. This is
      // mapped over every row of a list, so one bad title fails the whole page.
      this.logger.error(`No engagement aggregate was built for title ${title.id}`);
      throw new InternalServerErrorException();
    }
    return new TitleResponseDto(
      title,
      titleEngagement,
      this.posterService.toPublicUrl(title.posterKey),
    );
  }
}
