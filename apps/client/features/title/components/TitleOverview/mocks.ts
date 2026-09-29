/**
 * TEMPORARY: design-file fixtures for the parts of the title-detail (Film)
 * page that have no endpoint yet (cast, Watchly's own score, reviews, stream
 * stats). Same convention as DiscoverScreen/mocks.ts. Drop this file once
 * those endpoints land — nothing outside TitleOverview/TitleInformation/
 * TitleReviews/MovieStream/SeriesStream/StreamFilmInfo/StreamPhotos imports it.
 */

export interface TitleScores {
  /** Watchly's own score — no endpoint yet. */
  tmovie: number;
}

export interface CastMember {
  name: string;
  avatarUrl: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  avatarUrl: string;
  score: number;
  text: string;
  postedAt: Date;
  likes: number;
  dislikes: number;
  hasSpoiler?: boolean;
  replies?: ReviewComment[];
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
  reviews: ReviewComment[];
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
  reviews: [
    {
      id: "c1",
      author: "Ava Anderson",
      avatarUrl: "https://picsum.photos/id/1027/120/120",
      score: 10,
      text: "I wish season three would come out sooner.",
      postedAt: new Date("2026-09-19T10:00:00Z"),
      likes: 5000,
      dislikes: 0,
      replies: [
        {
          id: "c1-r1",
          author: "Ethan Davis",
          avatarUrl: "https://picsum.photos/id/1005/120/120",
          score: 9,
          text: "Same here, the wait is brutal — especially after how season two ended.",
          postedAt: new Date("2026-09-19T11:00:00Z"),
          likes: 120,
          dislikes: 2,
          hasSpoiler: true,
        },
      ],
    },
    {
      id: "c2",
      author: "Emily Johnson",
      avatarUrl: "https://picsum.photos/id/1011/120/120",
      score: 8,
      text: "The production design keeps getting better every season.",
      postedAt: new Date("2026-09-18T09:30:00Z"),
      likes: 812,
      dislikes: 6,
      replies: [
        {
          id: "c2-r1",
          author: "William Brown",
          avatarUrl: "https://picsum.photos/id/1012/120/120",
          score: 7,
          text: "Agreed, the dragon scenes alone are worth it — that ending changes everything though.",
          postedAt: new Date("2026-09-18T10:15:00Z"),
          likes: 64,
          dislikes: 1,
          hasSpoiler: true,
        },
      ],
    },
    {
      id: "c3",
      author: "III_VAHPUK_III",
      avatarUrl: "https://picsum.photos/id/1025/120/120",
      score: 9,
      text: "Pacing dragged a little mid-season but the finale delivered.",
      postedAt: new Date("2026-09-17T14:45:00Z"),
      likes: 340,
      dislikes: 12,
    },
    {
      id: "c4",
      author: "Benjamin Wilson",
      avatarUrl: "https://picsum.photos/id/1035/120/120",
      score: 6,
      text: "Not as strong as the source material, but still solid TV.",
      postedAt: new Date("2026-09-16T08:20:00Z"),
      likes: 98,
      dislikes: 21,
    },
    {
      id: "c5",
      author: "David Jones",
      avatarUrl: "https://picsum.photos/id/1041/120/120",
      score: 10,
      text: "Best fantasy series currently airing, no contest.",
      postedAt: new Date("2026-09-15T19:05:00Z"),
      likes: 2200,
      dislikes: 40,
    },
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
