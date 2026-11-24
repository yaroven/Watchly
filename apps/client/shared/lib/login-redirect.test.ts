import { describe, expect, it } from "vitest";
import { localizedLoginUrl, loginPath, safeReturnPath, stripLocale } from "./login-redirect";

describe("login redirects", () => {
  it("keeps the page language when a session ends", () => {
    expect(localizedLoginUrl("/uk/admin/titles/t-1?tab=cast")).toBe("/uk/login?next=%2Fadmin%2Ftitles%2Ft-1%3Ftab%3Dcast");
  });

  it("falls back to the default language for a path without one", () => {
    expect(localizedLoginUrl("/watchlist")).toBe("/en/login?next=%2Fwatchlist");
  });

  it("returns a path without its locale, so the next page can add the current one", () => {
    expect(stripLocale("/uk/title/t-1")).toEqual({ locale: "uk", path: "/title/t-1" });
    expect(safeReturnPath("/en/watchlist")).toBe("/watchlist");
  });

  it("never sends a viewer to another site or back to the login page", () => {
    expect(safeReturnPath("https://evil.example")).toBeNull();
    expect(safeReturnPath("//evil.example/x")).toBeNull();
    expect(safeReturnPath("/\\evil.example")).toBeNull();
    expect(safeReturnPath("/uk/login?next=/x")).toBeNull();
  });

  it("adds no return path for the home page", () => {
    expect(loginPath("/")).toBe("/login");
    expect(loginPath(undefined)).toBe("/login");
  });
});
