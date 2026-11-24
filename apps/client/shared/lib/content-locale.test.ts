import { describe, expect, it } from "vitest";
import { languageName, translationCoverage } from "./content-locale";

const FIELDS = ["name", "description"] as const;

describe("translationCoverage", () => {
  it("reads a missing translation as none", () => {
    expect(translationCoverage(null, FIELDS)).toBe("none");
  });

  it("reads blank strings as untranslated", () => {
    expect(translationCoverage({ name: "  ", description: "" }, FIELDS)).toBe("none");
  });

  it("is partial while some fields are still empty", () => {
    expect(translationCoverage({ name: "Скляне царство", description: "" }, FIELDS)).toBe("partial");
  });

  it("is done when every field is filled", () => {
    expect(translationCoverage({ name: "Скляне царство", description: "Місто під куполом." }, FIELDS)).toBe("done");
  });
});

describe("languageName", () => {
  it("names a language in the interface language, capitalized", () => {
    expect(languageName("uk", "uk")).toBe("Українська");
    expect(languageName("uk", "en")).toBe("Ukrainian");
    expect(languageName("de", "uk")).toBe("Німецька");
  });

  it("falls back to the code for something Intl cannot name", () => {
    expect(languageName("not a code", "en")).toBe("NOT A CODE");
  });
});
