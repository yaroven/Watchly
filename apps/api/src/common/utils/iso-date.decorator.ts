import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsDate } from "class-validator";

/**
 * An ISO 8601 date on the wire, a `Date` by the time a service sees it.
 *
 * The global `ValidationPipe` runs with `transform: true`, so the conversion
 * belongs here rather than in every service that writes the column — Prisma
 * wants a `Date`, and `new Date(dto.field)` at each call site is the same line
 * repeated with nothing to stop one of them being forgotten.
 *
 * Only strings are converted, so a number or an object stays what it was and
 * `@IsDate` rejects it: the wire contract is still "a date string" rather than
 * "anything the Date constructor will accept". An unparseable string becomes an
 * invalid Date, which `@IsDate` also rejects.
 *
 * It converts at the HTTP boundary only. A service called directly — from a
 * spec, say — gets exactly what the caller passed, which is why the field's
 * type is the thing to trust.
 */
export function IsIsoDate() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === "string" ? new Date(value) : value,
    ),
    IsDate(),
  );
}
