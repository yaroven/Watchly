import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { Sorting } from "../common/pagination/pagination.types";

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
