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

const OVERRIDES: Record<string, Partial<TitleOverviewFixture>> = {};

export function getTitleOverviewFixture(titleId: string): TitleOverviewFixture {
  const override = OVERRIDES[titleId];
  if (!override) return DEFAULT_FIXTURE;
  return { ...DEFAULT_FIXTURE, ...override };
}

const EPISODE_THUMBNAILS: Record<string, string> = {};

export function getEpisodeThumbnail(episodeId: string, fallbackPosterUrl?: string): string | undefined {
  return EPISODE_THUMBNAILS[episodeId] ?? fallbackPosterUrl;
}

export function getEpisodeScore(number: number): number {
  return 7 + ((number * 37) % 23) / 10;
}
