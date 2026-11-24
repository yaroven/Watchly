import type { CastCredit } from "@/features/title/schemas/title";
import { describe, expect, it } from "vitest";
import { castCoverage, toCastCreditInputs, toCastRows, withCharacterTranslation } from "./cast-rows";

const credit = (id: string, order: number, characterTranslations: CastCredit["characterTranslations"]): CastCredit => ({
  id: `credit-${id}`,
  character: `Character ${id}`,
  characterTranslations,
  order,
  artist: { id, name: `Artist ${id}` },
  content: { locale: "en", fallback: false },
});

describe("cast rows", () => {
  it("should resend every stored character translation on a save that did not touch it", () => {
    const rows = toCastRows([credit("b", 1, {}), credit("a", 0, { uk: "Персонаж А" })]);

    expect(toCastCreditInputs(rows)).toEqual([
      { artistId: "a", character: "Character a", characterTranslations: { uk: "Персонаж А" }, order: 0 },
      { artistId: "b", character: "Character b", characterTranslations: {}, order: 1 },
    ]);
  });

  it("should send an edited translation trimmed, and drop it when blanked", () => {
    const [edited, blanked] = toCastRows([credit("a", 0, {}), credit("b", 1, { uk: "Старе" })]);

    const inputs = toCastCreditInputs([withCharacterTranslation(edited, "uk", "  Нове  "), withCharacterTranslation(blanked, "uk", "   ")]);

    expect(inputs.map((input) => input.characterTranslations)).toEqual([{ uk: "Нове" }, {}]);
  });
});

describe("castCoverage", () => {
  it("counts only credits that have an English character", () => {
    const rows = toCastRows([credit("a", 0, { uk: "А" }), { ...credit("b", 1, {}), character: "" }]);

    expect(castCoverage(rows, ["uk"])).toEqual({ uk: "done" });
  });

  it("is partial while some characters are untranslated, none when all are", () => {
    const some = toCastRows([credit("a", 0, { uk: "А" }), credit("b", 1, {})]);
    const none = toCastRows([credit("a", 0, {}), credit("b", 1, { uk: "  " })]);

    expect(castCoverage(some, ["uk"])).toEqual({ uk: "partial" });
    expect(castCoverage(none, ["uk"])).toEqual({ uk: "none" });
  });
});
