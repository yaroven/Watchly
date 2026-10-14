import type { Response } from "express";
import { parseDurationMs } from "../common/utils/duration.util";

export const REFRESH_COOKIE_NAME = "refreshToken";
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
