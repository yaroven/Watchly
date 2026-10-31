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
import { Filter, Sorting } from "../../../common/pagination/pagination.types";
import { FilteringParams } from "../../../decorators/filtering-params.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { SortingParams } from "../../../decorators/sorting-params.decorator";
import { SeasonService } from "../../../services/season/season.service";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonResponseDto } from "./dto/response/season-response.dto";

@ApiTags("seasons")
@Controller("seasons")
export class SeasonsController {
  constructor(private readonly seasonService: SeasonService) {}

  @ApiOperation({ summary: "Create a season for a title" })
  @ApiCreatedResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Post()
  async create(@Body() createSeasonDto: CreateSeasonDto): Promise<SeasonResponseDto> {
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
  ): Promise<SeasonResponseDto[]> {
    return this.seasonService.findAll(filters, sort);
  }

  @ApiOperation({ summary: "Get a season by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<SeasonResponseDto> {
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
  async update(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
    @Body() updateSeasonDto: UpdateSeasonDto,
  ): Promise<SeasonResponseDto> {
    return this.seasonService.update(id, updateSeasonDto);
  }

  @ApiOperation({ summary: "Delete a season and cascade-delete its episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<SeasonResponseDto> {
    return this.seasonService.delete(id);
  }
}
