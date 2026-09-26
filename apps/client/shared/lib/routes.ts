// Path constants

const ADMIN_BASE = "/admin";
const DISCOVER_BASE = "/discover";
const TITLE_BASE = "/title";

const createAdminPath = (path: string) => `${ADMIN_BASE}/${path}`;
const createDiscoverPath = (path: string) => `${DISCOVER_BASE}/${path}`;
const createTitlePath = (path: string) => `${TITLE_BASE}/${path}`;

export const APP = {
  ROOT: "/",
  DISCOVER: DISCOVER_BASE,
  MOVIES: createDiscoverPath("movie"),
  SERIES_LIST: createDiscoverPath("series"),
  TITLE: (id: string) => createTitlePath(id),
  WATCH: (id: string, episodeId?: string) => `${createTitlePath(`${id}/watch`)}${episodeId ? `?episode=${episodeId}` : ""}`,
  GENRES: createDiscoverPath("genres"),
  SEARCH: (params?: { q?: string; type?: "MOVIE" | "SERIES"; director?: string; network?: string; genreId?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.type) search.set("type", params.type);
    if (params?.director) search.set("director", params.director);
    if (params?.network) search.set("network", params.network);
    if (params?.genreId) search.set("genreId", params.genreId);
    const query = search.toString();
    return `${createDiscoverPath("search")}${query ? `?${query}` : ""}`;
  },
  WATCHLIST: "/watchlist",
  LOGIN: "/login",
  REGISTER: "/register",
};

export const ADMIN = {
  ROOT: ADMIN_BASE,
  DASHBOARD: createAdminPath("dashboard"),
  TITLES: createAdminPath("titles"),
  TITLES_NEW: createAdminPath("titles/new"),
  TITLES_EDIT: (id: string) => createAdminPath(`titles/${id}`),
};
