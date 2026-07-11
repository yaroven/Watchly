// Path constants
const ADMIN_BASE = "/admin";

// Path functions
const createAdminPath = (path: string) => `${ADMIN_BASE}/${path}`;

export const APP = {};
export const ADMIN = {
  ROOT: ADMIN_BASE,
  DASHBOARD: createAdminPath("dashboard"),
  TITLES: createAdminPath("titles"),
  TITLES_NEW: createAdminPath("titles/new"),
  TITLES_EDIT: (id: string) => createAdminPath(`titles/edit/${id}`),
};
