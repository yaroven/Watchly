import { localize, translationFor, translationsInclude, translationsQuery } from "./localize.util";

const english = { name: "Spirited Away", description: "A girl in a spirit world." };
const ukrainian = { name: "Віднесені привидами", description: "Дівчинка у світі духів." };

describe("localize", () => {
  it("should serve the translation when the requested locale has one", () => {
    expect(localize(english, ukrainian, "uk")).toEqual({
      fields: ukrainian,
      content: { locale: "uk", fallback: false },
    });
  });

  it("should serve English and flag the fallback when the requested locale has none", () => {
    expect(localize(english, undefined, "uk")).toEqual({
      fields: english,
      content: { locale: "en", fallback: true },
    });
  });

  it("should serve English without a fallback flag for an English request", () => {
    expect(localize(english, ukrainian, "en")).toEqual({
      fields: english,
      content: { locale: "en", fallback: false },
    });
  });
});

describe("translationFor", () => {
  it("should pick the requested locale's row", () => {
    const rows = [{ locale: "uk", name: "Драма" }];
    expect(translationFor(rows, "uk")).toBe(rows[0]);
  });

  it("should find nothing when the relation was not loaded or holds another locale", () => {
    expect(translationFor(undefined, "uk")).toBeUndefined();
    expect(translationFor([{ locale: "uk", name: "Драма" }], "en")).toBeUndefined();
  });
});

describe("translationsInclude", () => {
  it("should load nothing for English", () => {
    expect(translationsInclude("en")).toEqual({});
  });

  it("should load only the requested locale's row otherwise", () => {
    expect(translationsInclude("uk")).toEqual({ translations: { where: { locale: "uk" } } });
  });
});

describe("translationsQuery", () => {
  it("should add no include argument at all for English", () => {
    expect(translationsQuery("en")).toEqual({});
  });

  it("should include only the requested locale's row otherwise", () => {
    expect(translationsQuery("uk")).toEqual({
      include: { translations: { where: { locale: "uk" } } },
    });
  });
});
