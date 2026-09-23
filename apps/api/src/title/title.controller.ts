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
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { UrlResponseDto } from "../common/dto/url-response.dto";
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { SetTitleCastDto } from "./dto/request/set-title-cast.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";
import { TitleListResponseDto } from "./dto/response/title-list.response.dto";
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
      "Filterable: name, type, transcodingStatus, ageRating, country, language. " +
      "`sort`: `property:direction`. Sortable: name, createdAt, releaseDate.",
  })
  @ApiOkResponse({ type: TitleListResponseDto })
  @Get()
  async findAll(
    @Query() query: GetAllTitleDto,
    @SortingParams(["name", "createdAt", "releaseDate"]) sort?: Sorting,
    @FilteringParams(["name", "type", "transcodingStatus", "ageRating", "country", "language"])
    filters?: Filter[],
  ) {
    return this.titleService.findAll(query, sort, filters);
  }

  @ApiOperation({ summary: "Get a title by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const title = await this.titleService.findOne(id);

    if (!title) throw new NotFoundException(`Title with id ${id} not found`);

    return title;
  }

  @ApiOperation({ summary: "Update a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Patch(":id")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() data: UpdateTitleDto) {
    return this.titleService.update(id, data);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Get(":id/upload-url")
  getUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.createMovieUploadingUrl(id);
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
}
