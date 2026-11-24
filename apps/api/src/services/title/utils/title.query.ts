import {
  EngagementCounters,
  ExternalRatings,
  Prisma,
  ReactionType,
  Title,
  TitleEngagement,
  TitleTranslation,
} from "@prisma/client";
import { BASE_LOCALE, Locale } from "../../../common/locale.const";
import { translationsInclude } from "../../../common/utils/localize.util";
import { GenreWithTranslations } from "../../genre/genre.types";

export type EngagementRelations = {
  engagement: TitleEngagement | null;
  counters: EngagementCounters | null;
  ratings?: { score: number }[];
  reactions?: { type: ReactionType }[];
  watchlistEntries?: { id: string }[];
};

export type TitleWithEngagement = Title &
  EngagementRelations & {
    genres: GenreWithTranslations[];
    externalRatings: ExternalRatings[];
    translations?: TitleTranslation[];
  };

const titleQuery = {
  base: (locale: Locale) =>
    ({
      genres: locale === BASE_LOCALE ? true : { include: translationsInclude(locale) },
      externalRatings: true,
      ...translationsInclude(locale),
    }) satisfies Prisma.TitleInclude,

  engagement: (viewerId: string | null) =>
    ({
      engagement: true,
      counters: true,
      ...(viewerId
        ? {
            ratings: { where: { userId: viewerId }, select: { score: true } },
            reactions: { where: { userId: viewerId }, select: { type: true } },
            watchlistEntries: { where: { userId: viewerId }, select: { id: true } },
          }
        : {}),
    }) satisfies Prisma.TitleInclude,

  withEngagement: (viewerId: string | null, locale: Locale) =>
    ({
      ...titleQuery.base(locale),
      ...titleQuery.engagement(viewerId),
    }) satisfies Prisma.TitleInclude,

  engagementOnly: (viewerId: string | null) =>
    ({ id: true, ...titleQuery.engagement(viewerId) }) satisfies Prisma.TitleSelect,

  assets: () => ({ seasons: { include: { episodes: true } } }) satisfies Prisma.TitleInclude,

  deleted: () => ({ genres: true }) satisfies Prisma.TitleInclude,
};

export default titleQuery;
