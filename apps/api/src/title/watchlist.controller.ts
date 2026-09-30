import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
import { PaginatedResponseOf } from "../common/utils/paginated-response-of.util";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import { TitleService } from "./title.service";

/// Lives in the title module rather than the engagement one: a watchlist page
/// is a list of titles, and only this module knows how a title is serialised.
@ApiTags("titles")
@Controller("watchlist")
export class WatchlistController {
  constructor(private readonly titleService: TitleService) {}

  @ApiOperation({ summary: "List the titles on your watchlist", description: "Newest first." })
  @ApiOkResponse({ type: PaginatedResponseOf(TitleResponseDto) })
  @Auth()
  @Get()
  findAll(@Query() query: GetAllTitleDto, @Req() { userId }: Request) {
    return this.titleService.findWatchlist(userId!, query);
  }
}
