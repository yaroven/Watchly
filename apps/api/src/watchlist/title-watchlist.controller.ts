import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { TitleEngagementDto } from "../title/dto/response/title-engagement.dto";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { WatchlistService } from "./watchlist.service";

/// The two title-scoped routes, kept on the `title` prefix so the URLs and the
/// Swagger section do not move with the module.
@ApiTags("titles")
@Controller("titles")
export class TitleWatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @ApiOperation({ summary: "Put a title on your watchlist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post(":id/watchlist")
  add(@Param("id", ParseUUIDPipe, TitleExistsPipe) id: string, @CurrentUserId() userId: string) {
    return this.watchlistService.add(id, userId);
  }

  @ApiOperation({ summary: "Take a title off your watchlist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Delete(":id/watchlist")
  remove(@Param("id", ParseUUIDPipe, TitleExistsPipe) id: string, @CurrentUserId() userId: string) {
    return this.watchlistService.remove(id, userId);
  }
}
