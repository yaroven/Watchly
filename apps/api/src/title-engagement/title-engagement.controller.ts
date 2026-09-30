import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { ReactToTitleDto } from "./dto/request/react-to-title.dto";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import { TitleEngagementService } from "./title-engagement.service";

@ApiTags("title-engagement")
@Controller("title/:id")
export class TitleEngagementController {
  constructor(private readonly engagement: TitleEngagementService) {}

  @ApiOperation({
    summary: "Get a title's engagement counts",
    description:
      "Public. A signed-in caller also gets their own vote and watchlist state back, so the controls can render as already set.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @OptionalAuth()
  @Get("engagement")
  get(@Param("id", ParseUUIDPipe) id: string, @Req() { userId }: Request) {
    return this.engagement.summarize(id, userId);
  }

  @ApiOperation({
    summary: "Like or dislike a title",
    description: "Sending the vote you already cast withdraws it; the other one switches sides.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post("reaction")
  react(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() { type }: ReactToTitleDto,
    @Req() { userId }: Request,
  ) {
    return this.engagement.react(id, userId, type);
  }

  @ApiOperation({ summary: "Withdraw your vote on a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @Auth()
  @Delete("reaction")
  removeReaction(@Param("id", ParseUUIDPipe) id: string, @Req() { userId }: Request) {
    return this.engagement.removeReaction(id, userId);
  }

  @ApiOperation({ summary: "Put a title on your watchlist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post("watchlist")
  addToWatchlist(@Param("id", ParseUUIDPipe) id: string, @Req() { userId }: Request) {
    return this.engagement.addToWatchlist(id, userId);
  }

  @ApiOperation({ summary: "Take a title off your watchlist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @Auth()
  @Delete("watchlist")
  removeFromWatchlist(@Param("id", ParseUUIDPipe) id: string, @Req() { userId }: Request) {
    return this.engagement.removeFromWatchlist(id, userId);
  }
}
