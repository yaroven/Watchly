import TranscodingStatus from "@/types/transcoding-status";

interface SeasonLike {
  id: string;
  number: number;
}

interface EpisodeLike {
  id: string;
  number: number;
  seasonId?: string;
  transcodingStatus: TranscodingStatus;
}

export interface PlaybackPorts<S extends SeasonLike, E extends EpisodeLike> {
  seasons: () => Promise<S[]>;
  episodes: (seasonId: string) => Promise<E[]>;
  seasonOfEpisode?: (episodeId: string) => Promise<string | null>;
}

export interface ResolvedSeason<S, E> {
  seasons: S[];
  season: S | null;
  episodes: E[];
}

export const isPlayable = (item: { transcodingStatus: TranscodingStatus }) => item.transcodingStatus === TranscodingStatus.COMPLETED;

export async function resolveCurrentSeason<S extends SeasonLike, E extends EpisodeLike>(
  ports: PlaybackPorts<S, E>,
  wanted: { seasonId?: string | null; episodeId?: string | null } = {},
): Promise<ResolvedSeason<S, E>> {
  const seasons = [...(await ports.seasons())].sort((a, b) => a.number - b.number);
  if (!seasons.length) return { seasons, season: null, episodes: [] };

  const episodeSeasonId =
    wanted.episodeId && ports.seasonOfEpisode ? await ports.seasonOfEpisode(wanted.episodeId).catch(() => null) : null;
  const preferred = seasons.find((season) => season.id === (episodeSeasonId ?? wanted.seasonId));
  if (preferred) return { seasons, season: preferred, episodes: await ports.episodes(preferred.id) };

  let firstWithEpisodes: { season: S; episodes: E[] } | null = null;
  for (const season of seasons) {
    const episodes = await ports.episodes(season.id);
    if (episodes.some(isPlayable)) return { seasons, season, episodes };
    if (!firstWithEpisodes && episodes.length) firstWithEpisodes = { season, episodes };
  }

  return firstWithEpisodes ? { seasons, ...firstWithEpisodes } : { seasons, season: seasons[0], episodes: [] };
}

export async function resolveStreamUrl(item: { transcodingStatus: TranscodingStatus } | null | undefined, fetchUrl: () => Promise<string>) {
  if (!item || !isPlayable(item)) return "";
  return fetchUrl().catch(() => "");
}
