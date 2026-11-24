import { type Episode, EpisodeService } from "@features/episodes";
import { type Season, SeasonService } from "@features/season";
import type { ContentLocale } from "@shared/lib/content-locale";
import { cache } from "react";
import TitleService from "../api/title.service";
import { startEpisode } from "../components/SeriesStream/episode-session";
import { type Title, TitleType } from "../schemas/title";
import { type PlaybackPorts, resolveCurrentSeason, resolveStreamUrl } from "./playback-resolution";

export const getTitleForRequest = cache((id: string, locale: ContentLocale) => TitleService.getById(id, locale));

const seriesPorts = (titleId: string, locale: ContentLocale): PlaybackPorts<Season, Episode> => ({
  seasons: () => SeasonService.getAll(titleId, locale),
  episodes: (seasonId) => EpisodeService.getAll(seasonId, locale),
  seasonOfEpisode: async (episodeId) => (await EpisodeService.getById(episodeId, locale)).seasonId,
});

export interface TitlePageData {
  title: Title;
  seasons: Season[];
  currentSeasonId: string;
  episodes: Episode[];
}

export async function loadTitlePage(id: string, locale: ContentLocale, seasonId?: string): Promise<TitlePageData> {
  const title = await getTitleForRequest(id, locale);
  if (title.type !== TitleType.SERIES) return { title, seasons: [], currentSeasonId: "", episodes: [] };

  const { seasons, season, episodes } = await resolveCurrentSeason(seriesPorts(id, locale), { seasonId });
  return { title, seasons, currentSeasonId: season?.id ?? "", episodes };
}

export type WatchPageData =
  | { kind: "movie"; title: Title; streamUrl: string }
  | { kind: "series"; title: Title; season: Season; episodes: Episode[]; episodeId: string; streamUrl: string };

export async function loadWatchPage(id: string, locale: ContentLocale, episodeId?: string): Promise<WatchPageData | null> {
  const title = await getTitleForRequest(id, locale);

  if (title.type === TitleType.MOVIE) {
    return { kind: "movie", title, streamUrl: await resolveStreamUrl(title, () => TitleService.getStreamUrl(id)) };
  }

  const { season, episodes } = await resolveCurrentSeason(seriesPorts(id, locale), { episodeId });
  const episode = startEpisode(episodes, episodeId);
  if (!season || !episode) return null;

  const streamUrl = await resolveStreamUrl(episode, () => EpisodeService.getStreamUrl(episode.id));
  return { kind: "series", title, season, episodes, episodeId: episode.id, streamUrl };
}
