import { negotiateLocale } from "./locale.util";

describe("negotiateLocale", () => {
  it("should choose Ukrainian when it is the only language asked for", () => {
    expect(negotiateLocale("uk")).toBe("uk");
  });

  it("should match a region subtag on its primary language", () => {
    expect(negotiateLocale("uk-UA,uk;q=0.9,en;q=0.8")).toBe("uk");
  });

  it("should respect the header's preference order over the supported list's", () => {
    expect(negotiateLocale("de,en;q=0.9,uk;q=0.8")).toBe("en");
  });

  it("should prefer the higher weight even when it comes later", () => {
    expect(negotiateLocale("en;q=0.5,uk;q=0.9")).toBe("uk");
  });

  it("should keep the header's order between equal weights", () => {
    expect(negotiateLocale("uk,en")).toBe("uk");
    expect(negotiateLocale("en,uk")).toBe("en");
  });

  it("should fall back to English without a header", () => {
    expect(negotiateLocale(undefined)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
  });

  it("should fall back to English when only unsupported languages are named", () => {
    expect(negotiateLocale("de-DE,fr;q=0.8,*;q=0.1")).toBe("en");
  });

  it("should ignore a language refused with q=0", () => {
    expect(negotiateLocale("uk;q=0,en")).toBe("en");
  });

  it("should treat a malformed weight as a refusal rather than a preference", () => {
    expect(negotiateLocale("uk;q=abc")).toBe("en");
  });

  it("should accept a repeated header", () => {
    expect(negotiateLocale(["de", "uk;q=0.5"])).toBe("uk");
  });
});
