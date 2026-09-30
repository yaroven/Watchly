import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { PaginatedQueryDto } from "../../../common/dto/paginated-query.dto";

export const COMMENT_SORT_MODES = ["newest", "oldest", "hottest"] as const;
export type CommentSortMode = (typeof COMMENT_SORT_MODES)[number];

/**
 * Named sort modes rather than the generic `property:direction` the other list
 * endpoints take: "hottest" is not a column, it is a count of likes, and
 * exposing it as a property would promise an ordering the query cannot give.
 */
export class GetCommentsDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ enum: COMMENT_SORT_MODES, default: "newest" })
  @IsOptional()
  @IsIn(COMMENT_SORT_MODES)
  sort?: CommentSortMode;
}
