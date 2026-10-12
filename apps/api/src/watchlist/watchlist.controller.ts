import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { PaginatedQueryDto } from "../common/dto/paginated-query.dto";
import { PaginatedResponseOf } from "../common/utils/paginated-response-of.util";
import { TitleResponseDto } from "../title/dto/response/title-response.dto";
import { WatchlistService } from "./watchlist.service";

/// Tagged `titles` rather than `watchlist`: a watchlist page is a list of
/// titles, and splitting it into its own Swagger section separates it from the
/// response shape it returns.
@ApiTags("titles")
@Controller("watchlist")
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @ApiOperation({
    summary: "List the titles on your watchlist",
    description: "Newest addition first. Not sortable or filterable — page and limit only.",
  })
  @ApiOkResponse({ type: PaginatedResponseOf(TitleResponseDto) })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @Auth()
  @Get()
  findAll(@Query() query: PaginatedQueryDto, @CurrentUserId() userId: string) {
    return this.watchlistService.findAll(userId, query);
  }
}
