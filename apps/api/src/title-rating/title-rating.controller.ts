import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, Req } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
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
  @OptionalAuth()
  @Get()
  get(@Param("id", ParseUUIDPipe) id: string, @Req() { userId }: Request) {
    return this.titleRatingService.summarize(id, userId);
  }

  @ApiOperation({ summary: "Set or change your score for a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleRatingSummaryDto })
  @Auth()
  @Put()
  set(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: SetTitleRatingDto,
    @Req() { userId }: Request,
  ) {
    return this.titleRatingService.set(id, userId!, data.score);
  }

  @ApiOperation({ summary: "Withdraw your score" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleRatingSummaryDto })
  @ApiNotFoundResponse({ description: "You have not rated this title" })
  @Auth()
  @Delete()
  remove(@Param("id", ParseUUIDPipe) id: string, @Req() { userId }: Request) {
    return this.titleRatingService.remove(id, userId!);
  }
}
