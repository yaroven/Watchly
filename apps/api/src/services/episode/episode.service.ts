import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BASE_LOCALE, Locale, TranslationLocale } from "../../common/locale.const";
import { Filter, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { NameDescriptionTranslation, TranslationView } from "../../common/translation.types";
import { translationsQuery } from "../../common/utils/localize.util";
import { Logged } from "../../decorators/logged.decorator";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoLocation } from "../s3/processed-key";
import { toEpisodeView } from "./episode.mapper";
import { EpisodeInput, EpisodeUpdate, EpisodeView } from "./episode.types";
import { getEpisodeTitleAndSeasonId } from "./utils/episode-path.util";
import episodeQuery, { EpisodeWithPath } from "./utils/episode.query";

@Injectable()
export class EpisodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  @Logged()
  async create(data: EpisodeInput): Promise<EpisodeView> {
    try {
      const episode = await this.prisma.episode.create({ data });
      return toEpisodeView(episode, BASE_LOCALE);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2003")
      ) {
        throw new BadRequestException(
          error.code === "P2002"
            ? `Episode with number ${data.number} already exists in this season`
            : `Season with id ${data.seasonId} not found`,
        );
      }
      throw error;
    }
  }

  @Logged()
  async findAll(locale: Locale, filters: Filter[] = [], sort?: Sorting): Promise<EpisodeView[]> {
    const where = buildWhere(filters) as Prisma.EpisodeWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      number: "asc",
    }) as Prisma.EpisodeOrderByWithRelationInput;

    const episodes = await this.prisma.episode.findMany({
      where,
      orderBy,
      ...translationsQuery(locale),
    });
    return episodes.map((episode) => toEpisodeView(episode, locale));
  }

  @Logged()
  async findOneDetailed(id: string): Promise<EpisodeWithPath | null> {
    return this.prisma.episode.findUnique({
      where: { id },
      include: episodeQuery.detailed(),
    });
  }

  @Logged()
  async findOne(id: string, locale: Locale): Promise<EpisodeView | null> {
    const episode = await this.prisma.episode.findUnique({
      where: { id },
      ...translationsQuery(locale),
    });
    return episode ? toEpisodeView(episode, locale) : null;
  }

  @Logged()
  async update(id: string, data: EpisodeUpdate): Promise<EpisodeView> {
    const episode = await this.findOne(id, BASE_LOCALE);
    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    const existingEpisode = await this.prisma.episode.findFirst({
      where: {
        seasonId: episode.seasonId,
        number: data.number,
        id: { not: id },
      },
    });

    if (existingEpisode)
      throw new BadRequestException(
        `Episode with number ${data.number} already exists in this season`,
      );

    try {
      const updated = await this.prisma.episode.update({ where: { id }, data });
      return toEpisodeView(updated, BASE_LOCALE);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(
          `Episode with number ${data.number} already exists in this season`,
        );
      }
      throw error;
    }
  }

  @Logged()
  async delete(id: string): Promise<EpisodeView> {
    const episode = await this.findOneDetailed(id);
    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    const deleted = await this.prisma.episode.delete({ where: { id } });

    await this.mediaAssetService.cleanupEpisode({ id, seasonId, titleId });

    return toEpisodeView(deleted, BASE_LOCALE);
  }

  @Logged()
  async locate(id: string): Promise<VideoLocation> {
    const episode = await this.findOneDetailed(id);

    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    const { seasonId, titleId } = getEpisodeTitleAndSeasonId(episode);

    return { type: VideoType.EPISODE, titleId, seasonId, episodeId: episode.id };
  }

  @Logged()
  async listTranslations(
    episodeId: string,
  ): Promise<TranslationView<NameDescriptionTranslation>[]> {
    const rows = await this.prisma.episodeTranslation.findMany({
      where: { episodeId },
      orderBy: { locale: "asc" },
      select: { locale: true, name: true, description: true },
    });
    return rows as TranslationView<NameDescriptionTranslation>[];
  }

  @Logged()
  async upsertTranslation(
    episodeId: string,
    locale: TranslationLocale,
    data: NameDescriptionTranslation,
  ): Promise<TranslationView<NameDescriptionTranslation>> {
    try {
      const row = await this.prisma.episodeTranslation.upsert({
        where: { episodeId_locale: { episodeId, locale } },
        create: { episodeId, locale, name: data.name, description: data.description },
        update: { name: data.name, description: data.description },
        select: { locale: true, name: true, description: true },
      });
      return row as TranslationView<NameDescriptionTranslation>;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException(`Episode with id ${episodeId} not found`);
      }
      throw error;
    }
  }

  @Logged()
  async removeTranslation(episodeId: string, locale: TranslationLocale): Promise<void> {
    await this.prisma.episodeTranslation.deleteMany({ where: { episodeId, locale } });
  }
}
