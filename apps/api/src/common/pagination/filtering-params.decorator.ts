import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { FilterRule } from "./filter-rule.enum";
import { Filter } from "./pagination.types";

/**
 * Parses one or more `?filter=property:rule:value` into `Filter[]`, validating `property`
 * against `validParams` and `rule` against `FilterRule`. Empty array when none are sent.
 */
export const FilteringParams = (validParams: string[]) =>
  createParamDecorator((_data: unknown, ctx: ExecutionContext): Filter[] => {
    const raw = ctx.switchToHttp().getRequest<Request>().query.filter;
    if (raw === undefined) return [];

    const entries = Array.isArray(raw) ? raw : [raw];

    return entries.map((entry) => {
      if (typeof entry !== "string") {
        throw new BadRequestException("Invalid filter");
      }

      const [property, rule, ...valueParts] = entry.split(":");
      const value = valueParts.join(":");

      if (!validParams.includes(property)) {
        throw new BadRequestException(`Invalid filter property: ${property}`);
      }
      if (!Object.values(FilterRule).includes(rule as FilterRule)) {
        throw new BadRequestException(`Invalid filter rule: ${rule}`);
      }

      return { property, rule: rule as FilterRule, value };
    });
  })();
