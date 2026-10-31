import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CommentPageQuery } from "../../../../../services/comment/comment.types";
import {
  COMMENT_SORT_MODES,
  CommentSortMode,
} from "../../../../../services/comment/utils/comment-sort.const";
import { PaginatedQueryDto } from "../../../../dto/paginated-query.dto";

export class GetCommentsDto extends PaginatedQueryDto implements CommentPageQuery {
  @ApiPropertyOptional({ enum: COMMENT_SORT_MODES, default: "newest" })
  @IsOptional()
  @IsIn(COMMENT_SORT_MODES)
  sort?: CommentSortMode;
}
