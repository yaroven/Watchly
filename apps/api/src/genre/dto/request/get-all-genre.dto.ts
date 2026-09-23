import { IntersectionType, OmitType } from "@nestjs/swagger";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";
import { QueryWithFilterSortDto } from "../../../common/pagination/query-with-filter-sort.dto";

export class GetAllGenreDto extends IntersectionType(
  OmitType(PaginatedQueryDto, ["sort", "sortBy"]),
  QueryWithFilterSortDto,
) {}
