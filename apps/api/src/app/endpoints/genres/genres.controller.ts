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
import { Filter, Sorting } from "../../../common/pagination/pagination.types";
import { FilteringParams } from "../../../decorators/filtering-params.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { SortingParams } from "../../../decorators/sorting-params.decorator";
import { GenreService } from "../../../services/genre/genre.service";
import { GenreExistsPipe } from "../../../services/genre/utils/genre-exists.pipe";
import { Paginated, PaginatedResponseOf } from "../../dto/paginated-response-of.util";
import { CreateGenreDto } from "./dto/request/create-genre.dto";
import { GetAllGenreDto } from "./dto/request/get-all-genre.dto";
import { UpdateGenreDto } from "./dto/request/update-genre.dto";
import { GenreResponseDto } from "./dto/response/genre-response.dto";

@ApiTags("genres")
@Controller("genres")
export class GenresController {
  constructor(private readonly genreService: GenreService) {}

  @ApiOperation({ summary: "Create a genre" })
  @ApiCreatedResponse({ type: GenreResponseDto })
  @AdminOnly()
  @Post()
  create(@Body() data: CreateGenreDto): Promise<GenreResponseDto> {
    return this.genreService.create(data);
  }

  @ApiOperation({
    summary: "List genres with filter, sort, and pagination",
    description:
      "`filter` (repeatable): `property:rule:value`. Filterable: name. `sort`: `property:direction`. Sortable: name, createdAt.",
  })
  @ApiOkResponse({ type: PaginatedResponseOf(GenreResponseDto) })
  @Get()
  findAll(
    @Query() query: GetAllGenreDto,
    @SortingParams(["name", "createdAt"]) sort?: Sorting,
    @FilteringParams(["name"]) filters?: Filter[],
  ): Promise<Paginated<GenreResponseDto>> {
    return this.genreService.findAll(query, sort, filters);
  }

  @ApiOperation({ summary: "Get a genre by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: GenreResponseDto })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<GenreResponseDto> {
    const genre = await this.genreService.findOne(id);

    if (!genre) throw new NotFoundException(`Genre with id ${id} not found`);

    return genre;
  }

  @ApiOperation({ summary: "Update a genre" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: GenreResponseDto })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @AdminOnly()
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe, GenreExistsPipe) id: string,
    @Body() data: UpdateGenreDto,
  ): Promise<GenreResponseDto> {
    return this.genreService.update(id, data);
  }

  @ApiOperation({ summary: "Delete a genre" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: GenreResponseDto })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @AdminOnly()
  @Delete(":id")
  delete(@Param("id", ParseUUIDPipe) id: string): Promise<GenreResponseDto> {
    return this.genreService.delete(id);
  }
}
