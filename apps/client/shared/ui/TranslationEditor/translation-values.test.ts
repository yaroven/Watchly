import { describe, expect, it } from "vitest";
import { isSameTranslation, toTranslationValues, trimTranslationValues, validateTranslation } from "./translation-values";

const FIELDS = [
  { name: "name", maxLength: 5 },
  { name: "description", maxLength: 10 },
] as const;

describe("translation values", () => {
  it("should start blank when nothing is stored", () => {
    expect(toTranslationValues(FIELDS, null)).toEqual({ name: "", description: "" });
  });

  it("should require every field, as the api does", () => {
    expect(validateTranslation(FIELDS, trimTranslationValues({ name: "  ", description: "ok" }))).toEqual({ name: "required" });
  });

  it("should reject a field over its limit", () => {
    expect(validateTranslation(FIELDS, { name: "123456", description: "ok" })).toEqual({ name: "tooLong" });
  });

  it("should treat whitespace-only edits as unchanged", () => {
    expect(isSameTranslation(FIELDS, { name: "a ", description: "b" }, { name: "a", description: "b" })).toBe(true);
  });
});
