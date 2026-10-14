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
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId, OptionalUserId } from "../auth/decorators/current-user-id.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { PaginatedResponseOf } from "../common/utils/paginated-response-of.util";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { ReactToTitleDto } from "./dto/request/react-to-title.dto";
import { SetTitleRatingDto } from "./dto/request/set-title-rating.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleEngagementDto } from "./dto/response/title-engagement.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import { TitleService } from "./title.service";
import { TitleExistsPipe } from "./utils/title-exists.pipe";

@ApiTags("titles")
@Controller("titles")
export class TitleController {
  constructor(private readonly titleService: TitleService) {}

  @ApiOperation({ summary: "Create a title (movie or series)" })
  @ApiCreatedResponse({ type: TitleResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() data: CreateTitleDto) {
    return this.titleService.create(data);
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
    return this.titleService.update(id, data, userId);
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
    return this.titleService.getEngagement(id, userId ?? null);
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
  removeRating(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
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
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
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
  removeReaction(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.titleService.removeReaction(id, userId);
  }
}
