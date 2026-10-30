import { Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { ExternalRatingsService } from "../../../services/external-ratings/external-ratings.service";
import { ExternalRatingResponseDto } from "../titles/dto/response/external-rating-response.dto";
import { SyncExternalRatingsResponseDto } from "./dto/response/sync-external-ratings-response.dto";

@ApiTags("external-ratings")
@Controller("external-ratings")
export class ExternalRatingsController {
  constructor(private readonly externalRatingsService: ExternalRatingsService) {}

  @ApiOperation({ summary: "Sync IMDB/Rotten Tomatoes/Metacritic ratings for every title" })
  @ApiCreatedResponse({ type: SyncExternalRatingsResponseDto })
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @AdminOnly()
  @Post("sync")
  syncAll(): Promise<SyncExternalRatingsResponseDto> {
    return this.externalRatingsService.syncExternalRatings();
  }

  @ApiOperation({ summary: "Sync IMDB/Rotten Tomatoes/Metacritic ratings for one title" })
  @ApiParam({ name: "titleId", format: "uuid" })
  @ApiCreatedResponse({ type: [ExternalRatingResponseDto] })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @AdminOnly()
  @Post("titles/:titleId/sync")
  syncOne(@Param("titleId", ParseUUIDPipe) titleId: string): Promise<ExternalRatingResponseDto[]> {
    return this.externalRatingsService.syncRatingsForTitle(titleId);
  }
}
