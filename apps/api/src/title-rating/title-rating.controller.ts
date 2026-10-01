import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId, OptionalUserId } from "../auth/decorators/current-user-id.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { SetTitleRatingDto } from "./dto/request/set-title-rating.dto";
import { TitleRatingSummaryDto } from "./dto/response/title-rating-summary.dto";
import { TitleRatingService } from "./title-rating.service";

@ApiTags("title-ratings")
@Controller("title/:id/rating")
export class TitleRatingController {
  constructor(private readonly titleRatingService: TitleRatingService) {}

  @ApiOperation({
    summary: "Get a title's score",
    description:
      "Public. A signed-in caller also gets their own score back, so the control can show as already set.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleRatingSummaryDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @OptionalAuth()
  @Get()
  get(@Param("id", ParseUUIDPipe) id: string, @OptionalUserId() userId?: string) {
    return this.titleRatingService.summarize(id, userId ?? null);
  }

  @ApiOperation({ summary: "Set or change your score for a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleRatingSummaryDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Put()
  set(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: SetTitleRatingDto,
    @CurrentUserId() userId: string,
  ) {
    return this.titleRatingService.set(id, userId, data.score);
  }

  @ApiOperation({ summary: "Withdraw your score" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleRatingSummaryDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found, or you have not rated it" })
  @Auth()
  @Delete()
  remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.titleRatingService.remove(id, userId);
  }
}
