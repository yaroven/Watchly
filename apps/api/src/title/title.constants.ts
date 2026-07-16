export const DEFAULT_TITLE_POSTER_URL = "/cat.webp";

export function isDefaultTitlePoster(posterUrl: string): boolean {
  return posterUrl === DEFAULT_TITLE_POSTER_URL;
}
