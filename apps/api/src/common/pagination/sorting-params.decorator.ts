import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { Sorting } from "./pagination.types";

/**
 * Parses `?sort=property:direction` into a `Sorting`, validating `property` against
 * `validParams` and `direction` against asc/desc. Absent when no `sort` query param is sent.
 */
export const SortingParams = (validParams: string[]) =>
  createParamDecorator((_data: unknown, ctx: ExecutionContext): Sorting | undefined => {
    const raw = ctx.switchToHttp().getRequest<Request>().query.sort;
    if (typeof raw !== "string") return undefined;

    const [property, direction] = raw.split(":");
    if (!validParams.includes(property)) {
      throw new BadRequestException(`Invalid sort property: ${property}`);
    }
    if (direction !== "asc" && direction !== "desc") {
      throw new BadRequestException(`Invalid sort direction: ${direction}`);
    }

    return { property, direction };
  })();
