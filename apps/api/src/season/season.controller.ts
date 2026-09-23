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
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonResponseDto } from "./dto/response/season-response.dto";
import { SeasonService } from "./season.service";

@ApiTags("seasons")
@Controller("season")
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @ApiOperation({ summary: "Create a season for a title" })
  @ApiCreatedResponse({ type: SeasonResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonService.create(createSeasonDto);
  }

  @ApiOperation({
    summary: "List seasons, filterable and sortable",
    description:
      "`filter` (repeatable): `property:rule:value`, e.g. `filter=titleId:eq:<uuid>`. Filterable: titleId, number, name. " +
      "`sort`: `property:direction`, defaults to number:asc. Sortable: number, name, createdAt.",
  })
  @ApiOkResponse({ type: [SeasonResponseDto] })
  @Get()
  async findAll(
    @FilteringParams(["titleId", "number", "name"]) filters: Filter[],
    @SortingParams(["number", "name", "createdAt"]) sort?: Sorting,
  ) {
    return this.seasonService.findAll(filters, sort);
  }

  @ApiOperation({ summary: "Get a season by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const season = await this.seasonService.findOne(id);

    if (!season) {
      throw new NotFoundException(`Season with id ${id} not found`);
    }

    return season;
  }

  @ApiOperation({ summary: "Update a season" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Patch(":id")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() updateSeasonDto: UpdateSeasonDto) {
    return this.seasonService.update(id, updateSeasonDto);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the season's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Get(":id/poster-upload-url")
  getPosterUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.seasonService.createPosterUploadingUrl(id);
  }

  @ApiOperation({ summary: "Delete a season and cascade-delete its episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.seasonService.delete(id);
  }
}
