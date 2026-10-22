export interface EpisodeWithSeasonRef {
  seasonId: string;
  season: { titleId: string };
}

export function getEpisodeTitleAndSeasonId(episode: EpisodeWithSeasonRef) {
  return { seasonId: episode.seasonId, titleId: episode.season.titleId };
}
