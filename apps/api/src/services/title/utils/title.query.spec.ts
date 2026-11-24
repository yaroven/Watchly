import titleQuery from "./title.query";

describe("titleQuery", () => {
  it("should include no translations anywhere for English", () => {
    expect(titleQuery.base("en")).toEqual({ genres: true, externalRatings: true });
  });

  it("should load only the requested locale's row for the title and each genre", () => {
    expect(titleQuery.base("uk")).toEqual({
      genres: { include: { translations: { where: { locale: "uk" } } } },
      externalRatings: true,
      translations: { where: { locale: "uk" } },
    });
  });

  it("should carry the locale into the engagement read shape", () => {
    expect(titleQuery.withEngagement(null, "uk")).toMatchObject({
      translations: { where: { locale: "uk" } },
      engagement: true,
      counters: true,
    });
  });
});
