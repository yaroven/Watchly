export interface EpisodeAssets {
  id: string;
  seasonId: string;
  titleId: string;
}

export interface SeasonAssets {
  id: string;
  titleId: string;
  posterKey: string | null;
  episodes: { id: string }[];
}

export interface TitleAssets {
  id: string;
  posterKey: string | null;
  seasons: Omit<SeasonAssets, "titleId">[];
}
