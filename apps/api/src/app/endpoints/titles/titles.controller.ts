import {
  Body,
  Controller,
  Delete,
  Get,
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
import { Filter, Sorting } from "../../../common/pagination/pagination.types";
import { Auth } from "../../../decorators/auth.decorator";
import { CurrentUserId, OptionalUserId } from "../../../decorators/current-user-id.decorator";
import { FilteringParams } from "../../../decorators/filtering-params.decorator";
import { OptionalAuth } from "../../../decorators/optional-auth.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { SortingParams } from "../../../decorators/sorting-params.decorator";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { TitleEngagementService } from "../../../services/title-engagement/title-engagement.service";
import { TitleService } from "../../../services/title/title.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { TITLE_FILTERABLE } from "../../../services/title/utils/title-filter.query";
import { Paginated, PaginatedResponseOf } from "../../dto/paginated-response-of.util";
import { CompleteMultipartUploadDto } from "../../dto/request/complete-multipart-upload.dto";
import { StartMultipartUploadDto } from "../../dto/request/start-multipart-upload.dto";
import { MultipartUploadResponseDto } from "../../dto/response/multipart-upload-response.dto";
import { UrlResponseDto } from "../../dto/url-response.dto";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { SetTitleRatingDto } from "./dto/request/set-title-rating.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";

@ApiTags("titles")
@Controller("titles")
export class TitlesController {
  constructor(
    private readonly titleService: TitleService,
    private readonly engagementService: TitleEngagementService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  @ApiOperation({ summary: "Create a title (movie or series)" })
  @ApiCreatedResponse({ type: TitleResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() data: CreateTitleDto): Promise<TitleResponseDto> {
    return this.titleService.create(data);
  }

  @ApiOperation({
    summary: "List titles with filter, sort, and pagination",
    description:
      "`filter` (repeatable): `property:rule:value`, rule one of eq/neq/gt/gte/lt/lte/like/in/isnull. " +
      `Filterable: ${TITLE_FILTERABLE.join(", ")} ` +
      "(genres: rule eq/in, value is a genre id, or comma-separated ids for `in`). " +
      "`sort`: `property:direction`. Sortable: name, createdAt, releaseDate.",
  })
  @ApiOkResponse({ type: PaginatedResponseOf(TitleResponseDto) })
  @OptionalAuth()
  @Get()
  async findAll(
    @Query() query: GetAllTitleDto,
    @SortingParams(["name", "createdAt", "releaseDate"]) sort?: Sorting,
    @FilteringParams(TITLE_FILTERABLE) filters?: Filter[],
    @OptionalUserId() userId?: string,
  ): Promise<Paginated<TitleResponseDto>> {
    return this.titleService.findAll(query, sort, filters, userId);
  }

  @ApiOperation({ summary: "Get a title by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @OptionalAuth()
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @OptionalUserId() userId?: string,
  ): Promise<TitleResponseDto> {
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
  ): Promise<TitleResponseDto> {
    return this.titleService.update(id, data, userId);
  }

  @ApiOperation({ summary: "Delete a title and cascade-delete its seasons/episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<TitleResponseDto> {
    return this.titleService.delete(id);
  }

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
  getEngagement(
    @Param("id", ParseUUIDPipe) id: string,
    @OptionalUserId() userId?: string,
  ): Promise<TitleEngagementDto> {
    return this.engagementService.getEngagement(id, userId ?? null);
  }

  @ApiOperation({ summary: "Set or change your score for a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Auth()
  @Put(":id/rating")
  rate(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() data: SetTitleRatingDto,
    @CurrentUserId() userId: string,
  ): Promise<TitleEngagementDto> {
    return this.engagementService.rate(id, userId, data.score);
  }

  @ApiOperation({ summary: "Withdraw your score" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEngagementDto })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Title not found, or you have not rated it" })
  @Auth()
  @Delete(":id/rating")
  removeRating(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @CurrentUserId() userId: string,
  ): Promise<TitleEngagementDto> {
    return this.engagementService.removeRating(id, userId);
  }

  @ApiOperation({ summary: "Start a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: MultipartUploadResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Post(":id/upload-url")
  startUpload(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() dto: StartMultipartUploadDto,
  ) {
    return this.mediaAssetService.startUpload(id, dto.fileSize, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Complete a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Post(":id/upload-url/complete")
  completeUpload(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() dto: CompleteMultipartUploadDto,
  ) {
    return this.mediaAssetService.completeUpload(id, dto.uploadId, dto.parts, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Abort a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.mediaAssetService.abortUpload(id, uploadId, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe, TitleExistsPipe) id: string) {
    return this.mediaAssetService.scheduleTranscode(id, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "This title has no playable media yet" })
  @Get(":id/video")
  getPlaybackUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.mediaAssetService.getPlaybackUrl({ type: VideoType.MOVIE, titleId: id });
  }
}
