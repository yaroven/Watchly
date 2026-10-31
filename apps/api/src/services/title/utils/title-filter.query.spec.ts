import { FilterRule } from "../../../common/pagination/filter-rule.enum";
import { Filter } from "../../../common/pagination/pagination.types";
import { buildTitleWhere, TITLE_FILTERABLE } from "./title-filter.query";

const filter = (property: string, rule: FilterRule, value: string): Filter => ({
  property,
  rule,
  value,
});

describe("buildTitleWhere", () => {
  it("leaves scalar properties to the generic builder", () => {
    const where = buildTitleWhere([filter("network", FilterRule.EQ, "Netflix")]);

    expect(where).toEqual({ network: "Netflix" });
  });

  it("keeps the rule the scalar was given", () => {
    const where = buildTitleWhere([filter("name", FilterRule.LIKE, "dune")]);

    expect(where).toEqual({ name: { contains: "dune", mode: "insensitive" } });
  });

  describe("genres", () => {
    it("becomes a relation clause rather than a column comparison", () => {
      const where = buildTitleWhere([filter("genres", FilterRule.EQ, "genre-1")]);

      expect(where).toEqual({ genres: { some: { id: { in: ["genre-1"] } } } });
    });

    it("splits a comma-separated list under the IN rule", () => {
      const where = buildTitleWhere([filter("genres", FilterRule.IN, "genre-1,genre-2")]);

      expect(where).toEqual({ genres: { some: { id: { in: ["genre-1", "genre-2"] } } } });
    });

    it("collapses repeated filters on the same property into one clause", () => {
      const where = buildTitleWhere([
        filter("genres", FilterRule.EQ, "genre-1"),
        filter("genres", FilterRule.IN, "genre-2,genre-3"),
      ]);

      expect(where).toEqual({
        genres: { some: { id: { in: ["genre-1", "genre-2", "genre-3"] } } },
      });
    });
  });

  it("combines a scalar and a relation filter", () => {
    const where = buildTitleWhere([
      filter("country", FilterRule.EQ, "US"),
      filter("genres", FilterRule.EQ, "genre-1"),
    ]);

    expect(where).toEqual({
      country: "US",
      genres: { some: { id: { in: ["genre-1"] } } },
    });
  });

  it("answers an empty clause for no filters", () => {
    expect(buildTitleWhere([])).toEqual({});
  });

  it("does not dispatch an inherited key to the registry", () => {
    const where = buildTitleWhere([filter("toString", FilterRule.EQ, "x")]);

    expect(where).toEqual({ toString: "x" });
  });
});

describe("TITLE_FILTERABLE", () => {
  it("lists the scalar columns and every registered relation", () => {
    expect(TITLE_FILTERABLE).toContain("network");
    expect(TITLE_FILTERABLE).toContain("genres");
  });

  it("has no duplicates", () => {
    expect(new Set(TITLE_FILTERABLE).size).toBe(TITLE_FILTERABLE.length);
  });
});
