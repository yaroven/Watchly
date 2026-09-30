/**
 * TEMPORARY: design-file fixtures for the parts of the title-detail (Film)
 * page that have no endpoint yet (cast, stream stats). Same convention as
 * DiscoverScreen/mocks.ts. Drop this file once those endpoints land — nothing
 * outside TitleOverview/TitleInformation/MovieStream/SeriesStream/
 * StreamFilmInfo/StreamPhotos imports it.
 */

export interface TitleScores {
  /** Watchly's own score — no endpoint yet. */
  tmovie: number;
}

export interface CastMember {
  name: string;
  avatarUrl: string;
}

export interface StreamStats {
  likes: number;
  dislikes: number;
  shares: number;
  watchlistCount: number;
  photos: string[];
}

export interface TitleOverviewFixture {
  scores: TitleScores;
  cast: CastMember[];
  stream: StreamStats;
}

const DEFAULT_FIXTURE: TitleOverviewFixture = {
  scores: { tmovie: 8.7 },
  cast: [
    { name: "Olivia Cooke", avatarUrl: "https://picsum.photos/id/64/120/120" },
    { name: "Matt Smith", avatarUrl: "https://picsum.photos/id/65/120/120" },
    { name: "Milly Alcock", avatarUrl: "https://picsum.photos/id/91/120/120" },
    { name: "Rhys Ifans", avatarUrl: "https://picsum.photos/id/177/120/120" },
    { name: "Emma D'Arcy", avatarUrl: "https://picsum.photos/id/342/120/120" },
    { name: "Harry Collett", avatarUrl: "https://picsum.photos/id/433/120/120" },
    { name: "Bill Paterson", avatarUrl: "https://picsum.photos/id/453/120/120" },
  ],
  stream: {
    likes: 41200,
    dislikes: 1300,
    shares: 6200,
    watchlistCount: 9400,
    photos: Array.from({ length: 10 }, (_, index) => `https://picsum.photos/id/${1050 + index}/400/400`),
  },
};

/** Only the fields the design calls out differently per title live here; everything else falls back to DEFAULT_FIXTURE. */
const OVERRIDES: Record<string, Partial<TitleOverviewFixture>> = {};

export function getTitleOverviewFixture(titleId: string): TitleOverviewFixture {
  const override = OVERRIDES[titleId];
  if (!override) return DEFAULT_FIXTURE;
  return { ...DEFAULT_FIXTURE, ...override };
}

const EPISODE_THUMBNAILS: Record<string, string> = {};

/** Falls back to `fallbackPosterUrl` (the season's or title's poster) when the episode has no dedicated thumbnail. */
export function getEpisodeThumbnail(episodeId: string, fallbackPosterUrl?: string): string | undefined {
  return EPISODE_THUMBNAILS[episodeId] ?? fallbackPosterUrl;
}

/** Deterministic placeholder score until episode ratings have a real endpoint. */
export function getEpisodeScore(number: number): number {
  return 7 + ((number * 37) % 23) / 10;
}
