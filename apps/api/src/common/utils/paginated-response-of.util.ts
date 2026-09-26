import { Type } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

export function PaginatedResponseOf<TItem>(ItemClass: Type<TItem>) {
  class PaginatedResponseClass {
    @ApiProperty({ type: [ItemClass] })
    items: TItem[];

    @ApiProperty()
    totalCount: number;
  }
  Object.defineProperty(PaginatedResponseClass, "name", {
    value: `Paginated${ItemClass.name}`,
  });
  return PaginatedResponseClass;
}
