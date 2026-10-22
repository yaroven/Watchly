import { Prisma } from "@prisma/client";
import { FilterRule } from "../../common/pagination/filter-rule.enum";
import { Filter } from "../../common/pagination/pagination.types";
import { buildWhere } from "../../common/pagination/prisma-query.util";

type TitleSpecification = (filters: Filter[]) => Prisma.TitleWhereInput;

const idsOf = (filters: Filter[]): string[] =>
  filters.flatMap((filter) =>
    filter.rule === FilterRule.IN ? filter.value.split(",") : [filter.value],
  );

const RELATION_FILTERS: Record<string, TitleSpecification> = {
  genres: (filters) => ({ genres: { some: { id: { in: idsOf(filters) } } } }),
};

const SCALAR_FILTERS = [
  "name",
  "type",
  "transcodingStatus",
  "ageRating",
  "country",
  "language",
  "director",
  "network",
] as const;

export const TITLE_FILTERABLE: string[] = [...SCALAR_FILTERS, ...Object.keys(RELATION_FILTERS)];

export function buildTitleWhere(filters: Filter[]): Prisma.TitleWhereInput {
  const scalar: Filter[] = [];
  const relational = new Map<string, Filter[]>();

  for (const filter of filters) {
    if (Object.hasOwn(RELATION_FILTERS, filter.property)) {
      relational.set(filter.property, [...(relational.get(filter.property) ?? []), filter]);
      continue;
    }

    scalar.push(filter);
  }

  const where = buildWhere(scalar) as Prisma.TitleWhereInput;

  for (const [property, group] of relational) {
    Object.assign(where, RELATION_FILTERS[property](group));
  }

  return where;
}
