// Path constants

const ADMIN_BASE = "/admin";
const DISCOVER_BASE = "/discover";

// Path functions
const createAdminPath = (path: string) => `${ADMIN_BASE}/${path}`;
const createDiscoverPath = (path: string) => `${DISCOVER_BASE}/${path}`;

export const APP = {
  ROOT: "/",
  DISCOVER: DISCOVER_BASE,
  MOVIES: createDiscoverPath("movie"),
  SERIES_LIST: createDiscoverPath("series"),
  /** One detail route for both movies and series — the page branches on title type internally. */
  TITLE: (id: string) => createDiscoverPath(`title/${id}`),
  /** Pass `episodeId` to deep-link a specific episode; otherwise the page picks up where it left off (or the movie's only stream). */
  WATCH: (id: string, episodeId?: string) => `${createDiscoverPath(`title/${id}/watch`)}${episodeId ? `?episode=${episodeId}` : ""}`,
  GENRES: createDiscoverPath("genres"),
  /** With no args, browses everything; `type` alone browses one type with no text query (e.g. a catalog row's "View All"). */
  SEARCH: (params?: { q?: string; type?: "MOVIE" | "SERIES" }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.type) search.set("type", params.type);
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
