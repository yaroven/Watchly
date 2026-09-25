import { IntersectionType } from "@nestjs/swagger";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";
import { QueryWithFilterSortDto } from "../../../common/pagination/query-with-filter-sort.dto";

export class GetAllGenreDto extends IntersectionType(PaginatedQueryDto, QueryWithFilterSortDto) {}
