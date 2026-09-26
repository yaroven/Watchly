import { AgeRating, Title, TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";

/**
 * TEMPORARY: design-file fixtures for the parts of the title-detail (Film)
 * page that have no endpoint yet (cast, scores, info-table metadata, reviews,
 * "more like this"). Same convention as DiscoverScreen/mocks.ts. Drop this
 * file once those endpoints land — nothing outside TitleOverview/TitleInformation/
 * TitleReviews imports it.
 */

export interface TitleScores {
  imdb: number;
  rottenTomatoes: number;
  metacritic: number;
  tmovie: number;
}

export interface TitleMeta {
  ageRating: string;
  runtime: string;
  country: string;
  releaseDate: string;
  language: string;
  network?: string;
  director: string;
  closedCaption: string;
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
  genres: string[];
  scores: TitleScores;
  meta: TitleMeta;
  cast: CastMember[];
  reviews: ReviewComment[];
  stream: StreamStats;
}

const DEFAULT_FIXTURE: TitleOverviewFixture = {
  genres: ["Action", "Adventure", "Drama"],
  scores: { imdb: 8.4, rottenTomatoes: 92, metacritic: 68, tmovie: 8.7 },
  meta: {
    ageRating: "TV-MA",
    runtime: "50m",
    country: "United States",
    releaseDate: "August 21, 2022",
    language: "English",
    network: "HBO",
    director: "Ryan Condal",
    closedCaption: "English",
  },
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

const now = new Date("2026-01-01T00:00:00Z");

function mockTitle(id: string, name: string, description: string, posterId: number): Title {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    name,
    description,
    type: TitleType.SERIES,
    posterUrl: `https://picsum.photos/id/${posterId}/400/600`,
    ageRating: AgeRating.AGE_16,
    country: "US",
    releaseDate: "2026-01-01",
    language: "en",
    trailerUrl: "https://example.com/trailer.mp4",
    seasons: [],
    transcodingStatus: TranscodingStatus.COMPLETED,
  };
}

export const moreLikeThis: (Title & { rating: number; genres: string[] })[] = [
  {
    ...mockTitle(
      "mock-lotr-rings-of-power",
      "The Lord of the Rings ...",
      "An epic drama set thousands of years before the events of J.R.R. Tolkien's The Hobbit and The Lord of the Rings, following a cast of familiar and new characters as they confront the long-feared re-emergence of evil.",
      1005,
    ),
    rating: 7.0,
    genres: ["Action", "Drama", "Adventure"],
  },
  {
    ...mockTitle(
      "mock-those-about-to-die",
      "Those About to Die",
      "This series explores another side of Rome, the dirty business of entertaining the masses by giving them what the mob craves more, blood and spectacle.",
      1011,
    ),
    rating: 6.6,
    genres: ["Action", "Drama", "Adventure"],
  },
  {
    ...mockTitle(
      "mock-barbarians",
      "Barbarians",
      "The conflicting loyalty of a Roman officer, torn between the powerful empire that nurtured him and his tribal people, led to an epic historical conflict.",
      1025,
    ),
    rating: 7.2,
    genres: ["Action", "Drama", "Adventure"],
  },
  {
    ...mockTitle(
      "mock-rome",
      "Rome",
      "A simple account of the lives of both famous and ordinary Romans that takes place during the final days of the Roman Republic and...",
      1035,
    ),
    rating: 8.7,
    genres: ["Action", "Drama", "Historical"],
  },
  {
    ...mockTitle(
      "mock-white-queen",
      "The White Queen",
      "This series depicts three different women, all in the 15th century, who are eager to seize the throne in England.",
      1041,
    ),
    rating: 7.7,
    genres: ["Action", "Adventure", "Romantic"],
  },
];

const EPISODE_THUMBNAILS: Record<string, string> = {};

/** Falls back to `fallbackPosterUrl` (the season's or title's poster) when the episode has no dedicated thumbnail. */
export function getEpisodeThumbnail(episodeId: string, fallbackPosterUrl?: string): string | undefined {
  return EPISODE_THUMBNAILS[episodeId] ?? fallbackPosterUrl;
}

/** Deterministic placeholder score until episode ratings have a real endpoint. */
export function getEpisodeScore(number: number): number {
  return 7 + ((number * 37) % 23) / 10;
}
