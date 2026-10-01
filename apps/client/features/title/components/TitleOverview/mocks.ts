/**
 * TEMPORARY: design-file fixtures for the parts of the title, watch and episode
 * surfaces that have no endpoint yet — cast, stream photos, and per-episode
 * score/thumbnail. Same convention as DiscoverScreen/mocks.ts.
 *
 * Importers, all of which break if this file goes before its endpoints land:
 * - TitleInformation (cast)
 * - StreamPhotos (photos)
 * - StreamEpisodesSidebar and, in another feature, episodes/EpisodeList
 *   (getEpisodeScore / getEpisodeThumbnail)
 *
 * Retiring it takes three separate endpoints, not one — drop each fixture as its
 * own lands rather than the file as a whole.
 */

export interface CastMember {
  name: string;
  avatarUrl: string;
}

export interface StreamStats {
  photos: string[];
}

export interface TitleOverviewFixture {
  cast: CastMember[];
  stream: StreamStats;
}

const DEFAULT_FIXTURE: TitleOverviewFixture = {
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
