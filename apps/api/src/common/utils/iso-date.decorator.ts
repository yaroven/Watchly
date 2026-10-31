import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsDate } from "class-validator";

export function IsIsoDate() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === "string" ? new Date(value) : value,
    ),
    IsDate(),
  );
}
