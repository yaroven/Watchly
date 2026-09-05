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
  MOVIE: (id: string) => createDiscoverPath(`movie/${id}`),
  SERIES_LIST: createDiscoverPath("series"),
  SERIES: (id: string) => createDiscoverPath(`series/${id}`),
  /** Redirects to MOVIE or SERIES depending on the title type. */
  TITLE: (id: string) => createDiscoverPath(`title/${id}`),
  GENRES: createDiscoverPath("genres"),
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
