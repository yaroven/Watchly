import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId, OptionalUserId } from "../auth/decorators/current-user-id.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { CompleteMultipartUploadDto } from "../common/dto/request/complete-multipart-upload.dto";
import { StartMultipartUploadDto } from "../common/dto/request/start-multipart-upload.dto";
import { MultipartUploadResponseDto } from "../common/dto/response/multipart-upload-response.dto";
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { UrlResponseDto } from "../common/dto/url-response.dto";
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { PaginatedResponseOf } from "../common/utils/paginated-response-of.util";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { ReactToTitleDto } from "./dto/request/react-to-title.dto";
import { SetTitleCastDto } from "./dto/request/set-title-cast.dto";
import { SetTitleRatingDto } from "./dto/request/set-title-rating.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import { TitleService } from "./title.service";

@ApiTags("titles")
@Controller("title")
export class TitleController {
  constructor(private readonly titleService: TitleService) {}

  @ApiOperation({ summary: "Create a title (movie or series)" })
  @ApiCreatedResponse({ type: TitleResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() data: CreateTitleDto) {
    return this.titleService.create(data);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @Get(":id/video")
  getMovie(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.getMovieUrl(id);
  }

  @ApiOperation({
    summary: "List titles with filter, sort, and pagination",
    description:
      "`filter` (repeatable): `property:rule:value`, rule one of eq/neq/gt/gte/lt/lte/like/in/isnull. " +
      "Filterable: name, type, transcodingStatus, ageRating, country, language, director, network, genres " +
      "(genres: rule eq/in, value is a genre id, or comma-separated ids for `in`). " +
      "`sort`: `property:direction`. Sortable: name, createdAt, releaseDate.",
  })
  @ApiOkResponse({ type: PaginatedResponseOf(TitleResponseDto) })
  @OptionalAuth()
  @Get()
  async findAll(
    @Query() query: GetAllTitleDto,
    @SortingParams(["name", "createdAt", "releaseDate"]) sort?: Sorting,
    @FilteringParams([
      "name",
      "type",
      "transcodingStatus",
      "ageRating",
      "country",
      "language",
      "director",
      "network",
      "genres",
    ])
    filters?: Filter[],
    @OptionalUserId() userId?: string,
  ) {
    return this.titleService.findAll(query, sort, filters, userId);
  }

  @ApiOperation({ summary: "Get a title by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @OptionalAuth()
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string, @OptionalUserId() userId?: string) {
    const title = await this.titleService.findOne(id, userId);

    if (!title) throw new NotFoundException(`Title with id ${id} not found`);

    return title;
  }

  @ApiOperation({ summary: "Update a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: UpdateTitleDto,
    @CurrentUserId() userId: string,
  ) {
    // The viewer goes through so the echoed engagement block is this admin's own
    // state rather than a confident "you have not liked or saved this".
    return this.titleService.update(id, data, userId);
  }

  @ApiOperation({ summary: "Start a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: MultipartUploadResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Post(":id/upload-url")
  startUpload(@Param("id", ParseUUIDPipe) id: string, @Body() dto: StartMultipartUploadDto) {
    return this.titleService.startMovieUpload(id, dto.fileSize);
  }

  @ApiOperation({ summary: "Complete a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Post(":id/upload-url/complete")
  completeUpload(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CompleteMultipartUploadDto) {
    return this.titleService.completeMovieUpload(id, dto.uploadId, dto.parts);
  }

  @ApiOperation({ summary: "Abort a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.titleService.abortMovieUpload(id, uploadId);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the title's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Get(":id/poster-upload-url")
  getPosterUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.createPosterUploadingUrl(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Post(":id/transcode")
  transcodeMovie(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.transcode(id);
  }

  @ApiOperation({ summary: "Delete a title and cascade-delete its seasons/episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.delete(id);
  }

  @ApiOperation({ summary: "Get a title's cast, ordered for display" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [CastCreditResponseDto] })
  @Get(":id/cast")
  getCast(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.getCast(id);
  }

  @ApiOperation({ summary: "Replace a title's cast" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [CastCreditResponseDto] })
  @AdminOnly()
  @Put(":id/cast")
  setCast(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetTitleCastDto) {
    return this.titleService.setCast(id, dto.credits);
  }

  // --- Engagement: score, reactions, watchlist -------------------------------
  // One block, one read. `GET /title/:id/rating` is gone — it answered with the
  // same data this does, from the same tables, under a second cache key.

  @ApiOperation({
    summary: "Get a title's score, reactions and watchlist counts",
    description:
      "Public. A signed-in caller also gets their own score, vote and watchlist state back, so the controls can render as already set.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @OptionalAuth()
  @Get(":id/engagement")
  getEngagement(@Param("id", ParseUUIDPipe) id: string, @OptionalUserId() userId?: string) {
    return this.titleService.summarizeEngagement(id, userId ?? null);
  }

  @ApiOperation({ summary: "Set or change your score for a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Put(":id/rating")
  rate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: SetTitleRatingDto,
    @CurrentUserId() userId: string,
  ) {
    return this.titleService.rate(id, userId, data.score);
  }

  @ApiOperation({ summary: "Withdraw your score" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found, or you have not rated it" })
  @Auth()
  @Delete(":id/rating")
  removeRating(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.titleService.removeRating(id, userId);
  }

  @ApiOperation({
    summary: "Like or dislike a title",
    description: "Sending the vote you already cast withdraws it; the other one switches sides.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post(":id/reaction")
  react(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() { type }: ReactToTitleDto,
    @CurrentUserId() userId: string,
  ) {
    return this.titleService.react(id, userId, type);
  }

  @ApiOperation({ summary: "Withdraw your vote on a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Delete(":id/reaction")
  removeReaction(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.titleService.removeReaction(id, userId);
  }

  @ApiOperation({ summary: "Put a title on your watchlist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post(":id/watchlist")
  addToWatchlist(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.titleService.addToWatchlist(id, userId);
  }

  @ApiOperation({ summary: "Take a title off your watchlist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Delete(":id/watchlist")
  removeFromWatchlist(@Param("id", ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.titleService.removeFromWatchlist(id, userId);
  }
}
