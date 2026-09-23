import { FilterRule } from "./filter-rule.enum";
import { Filter, Sorting } from "./pagination.types";

export function buildOrderBy(sort?: Sorting): Record<string, "asc" | "desc"> | undefined {
  return sort ? { [sort.property]: sort.direction } : undefined;
}

export function buildWhere(filters: Filter[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const { property, rule, value } of filters) {
    where[property] = {
      [FilterRule.EQ]: value,
      [FilterRule.NEQ]: { not: value },
      [FilterRule.GT]: { gt: value },
      [FilterRule.GTE]: { gte: value },
      [FilterRule.LT]: { lt: value },
      [FilterRule.LTE]: { lte: value },
      [FilterRule.LIKE]: { contains: value, mode: "insensitive" },
      [FilterRule.IN]: { in: value.split(",") },
      [FilterRule.ISNULL]: value === "true" ? null : { not: null },
    }[rule];
  }

  return where;
}
