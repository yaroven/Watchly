import { FilterRule } from "./filter-rule.enum";

export interface Sorting {
  property: string;
  direction: "asc" | "desc";
}

export interface Filter {
  property: string;
  rule: FilterRule;
  value: string;
}
