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

/**
 * The Prisma shapes a title read is made of, composed the way the client's query
 * keys are: `base()` is the root rung and everything else is built from it, so a
 * field added to the base reaches every read that spreads it.
 *
 * `engagement()` feeds both an `include` (a title read, which also wants the
 * catalogue relations) and a `select` (an engagement-only read, which wants no
 * title columns at all). Relation entries are shaped identically in either
 * position, so one factory serves both — `include` and `select` are only
 * mutually exclusive at the top level of a query.
 */
const titleQuery = {
  /** The catalogue relations every title response serialises. */
  base: () => ({ genres: true, externalRatings: true }) satisfies Prisma.TitleInclude,

  /**
   * The viewer's three relations are omitted for an anonymous read rather than
   * filtered by `undefined`, which Prisma reads as "no filter" — that would hand
   * back every user's rows as if they were the viewer's.
   */
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

  /** A full title response: catalogue relations plus the engagement block. */
  withEngagement: (viewerId: string | null) =>
    ({ ...titleQuery.base(), ...titleQuery.engagement(viewerId) }) satisfies Prisma.TitleInclude,

  /**
   * Engagement without the title. `id` is there because a relation load needs a
   * parent row — and that row doubles as the existence check.
   */
  engagementOnly: (viewerId: string | null) =>
    ({ id: true, ...titleQuery.engagement(viewerId) }) satisfies Prisma.TitleSelect,

  /** What `delete` needs to find the S3 objects that cascade away with the row. */
  assets: () => ({ seasons: { include: { episodes: true } } }) satisfies Prisma.TitleInclude,

  /** `delete` still answers with a response body, so it keeps the genres. */
  deleted: () => ({ genres: true }) satisfies Prisma.TitleInclude,
};

export default titleQuery;
