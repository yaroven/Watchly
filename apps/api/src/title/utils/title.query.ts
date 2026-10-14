import {
  ExternalRatings,
  Genre,
  Prisma,
  ReactionType,
  Title,
  TitleEngagement,
} from "@prisma/client";

export type EngagementRelations = {
  engagement: TitleEngagement | null;
  ratings?: { score: number }[];
  reactions?: { type: ReactionType }[];
  watchlistEntries?: { id: string }[];
};

export type TitleWithEngagement = Title &
  EngagementRelations & { genres: Genre[]; externalRatings: ExternalRatings[] };

const titleQuery = {
  base: () => ({ genres: true, externalRatings: true }) satisfies Prisma.TitleInclude,

  engagement: (viewerId: string | null) =>
    ({
      engagement: true,
      ...(viewerId
        ? {
            ratings: { where: { userId: viewerId }, select: { score: true } },
            reactions: { where: { userId: viewerId }, select: { type: true } },
            watchlistEntries: { where: { userId: viewerId }, select: { id: true } },
          }
        : {}),
    }) satisfies Prisma.TitleInclude,

  withEngagement: (viewerId: string | null) =>
    ({ ...titleQuery.base(), ...titleQuery.engagement(viewerId) }) satisfies Prisma.TitleInclude,

  engagementOnly: (viewerId: string | null) =>
    ({ id: true, ...titleQuery.engagement(viewerId) }) satisfies Prisma.TitleSelect,

  assets: () => ({ seasons: { include: { episodes: true } } }) satisfies Prisma.TitleInclude,

  deleted: () => ({ genres: true }) satisfies Prisma.TitleInclude,
};

export default titleQuery;
