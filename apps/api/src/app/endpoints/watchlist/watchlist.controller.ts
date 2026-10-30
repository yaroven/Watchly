import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Auth } from "../../../decorators/auth.decorator";
import { CurrentUserId } from "../../../decorators/current-user-id.decorator";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { WatchlistService } from "../../../services/watchlist/watchlist.service";
import { PaginatedQueryDto } from "../../dto/paginated-query.dto";
import { Paginated, PaginatedResponseOf } from "../../dto/paginated-response-of.util";
import { TitleEngagementDto } from "../titles/dto/response/title-engagement.dto";
import { TitleResponseDto } from "../titles/dto/response/title-response.dto";

@ApiTags("watchlist")
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
  findAll(
    @Query() query: PaginatedQueryDto,
    @CurrentUserId() userId: string,
  ): Promise<Paginated<TitleResponseDto>> {
    return this.watchlistService.findAll(userId, query);
  }

  @ApiOperation({ summary: "Put a title on your watchlist" })
  @ApiParam({ name: "titleId", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post(":titleId")
  add(
    @Param("titleId", ParseUUIDPipe, TitleExistsPipe) titleId: string,
    @CurrentUserId() userId: string,
  ): Promise<TitleEngagementDto> {
    return this.watchlistService.add(titleId, userId);
  }

  @ApiOperation({ summary: "Take a title off your watchlist" })
  @ApiParam({ name: "titleId", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Delete(":titleId")
  remove(
    @Param("titleId", ParseUUIDPipe, TitleExistsPipe) titleId: string,
    @CurrentUserId() userId: string,
  ): Promise<TitleEngagementDto> {
    return this.watchlistService.remove(titleId, userId);
  }
}
