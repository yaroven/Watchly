import artistKeys from "@/features/artist/api/artist.keys";
import commentKeys from "@/features/comment/api/comment.keys";
import { episodeKeys } from "@/features/episodes/api/episode.keys";
import genreKeys from "@/features/genre/api/genre.keys";
import seasonKeys from "@/features/season/api/season.keys";
import titleEngagementKeys from "@/features/title-engagement/api/title-engagement.keys";
import type { QueryKey } from "@tanstack/react-query";
import titleKeys from "./title.keys";

export const catalogueCopies = {
  title: (id: string): QueryKey[] => [
    titleKeys.listsPrefix(),
    titleKeys.detailPrefix(id),
    titleEngagementKeys.watchlistsPrefix(),
    artistKeys.filmographiesPrefix(),
  ],

  anyTitle: (): QueryKey[] => [
    titleKeys.listsPrefix(),
    titleKeys.detailsPrefix(),
    titleEngagementKeys.watchlistsPrefix(),
    artistKeys.filmographiesPrefix(),
  ],

  titleStream: (id: string): QueryKey[] => [titleKeys.stream(id)],

  titleCast: (id: string): QueryKey[] => [titleKeys.castPrefix(id), artistKeys.filmographiesPrefix()],

  titleEngagement: (id: string): QueryKey[] => [
    ...catalogueCopies.title(id),
    titleEngagementKeys.detailPrefix(id),
    commentKeys.titleListsPrefix(id),
  ],

  anyGenre: (): QueryKey[] => [genreKeys.all(), ...catalogueCopies.anyTitle()],

  artist: (id: string): QueryKey[] => [
    artistKeys.listsPrefix(),
    artistKeys.detail(id),
    artistKeys.filmography(id),
    titleKeys.castsPrefix(),
  ],

  anyArtist: (): QueryKey[] => [artistKeys.listsPrefix(), titleKeys.castsPrefix()],

  season: (id: string): QueryKey[] => [seasonKeys.listsPrefix(), seasonKeys.detailPrefix(id)],

  anySeason: (): QueryKey[] => [seasonKeys.listsPrefix()],

  episode: (id: string): QueryKey[] => [episodeKeys.listsPrefix(), episodeKeys.detailPrefix(id)],

  anyEpisode: (): QueryKey[] => [episodeKeys.listsPrefix()],
};

export const ownedBy = {
  title: (id: string): QueryKey[] => [titleKeys.detailPrefix(id), titleKeys.stream(id), titleKeys.castPrefix(id)],
  artist: (id: string): QueryKey[] => [artistKeys.detail(id), artistKeys.filmography(id)],
  season: (id: string): QueryKey[] => [seasonKeys.detailPrefix(id)],
  episode: (id: string): QueryKey[] => [episodeKeys.detailPrefix(id)],
};
