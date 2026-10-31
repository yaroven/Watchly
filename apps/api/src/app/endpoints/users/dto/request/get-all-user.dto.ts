import { IntersectionType } from "@nestjs/swagger";
import { PaginatedQueryDto } from "../../../../dto/paginated-query.dto";
import { QueryWithFilterSortDto } from "../../../../dto/query-with-filter-sort.dto";

export class GetAllUserDto extends IntersectionType(PaginatedQueryDto, QueryWithFilterSortDto) {}
