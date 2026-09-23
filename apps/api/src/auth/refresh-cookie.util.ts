import type { Response } from "express";
import { parseDurationMs } from "../common/duration.util";

export const REFRESH_COOKIE_NAME = "refreshToken";
// Must be "/", not a narrow API sub-path: the client app's edge proxy (a different
// origin/port) reads this cookie on arbitrary routes like /admin to decide whether a
// visitor has a session at all. A cookie Path only controls which *request paths* carry
// it — it's evaluated against whatever path is being requested, regardless of which
// origin issued the Set-Cookie, so scoping it to "/auth/refresh" made it invisible to
// every route except that literal path. httpOnly + SameSite=Strict already provide the
// real protection here; narrowing Path bought no extra security, only broke this.
export const REFRESH_COOKIE_PATH = "/";

export function setRefreshCookie(res: Response, refreshToken: string, refreshExpiresIn: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: parseDurationMs(refreshExpiresIn),
  });
}
