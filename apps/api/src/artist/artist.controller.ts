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
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { ArtistService } from "./artist.service";
import { CreateArtistDto } from "./dto/request/create-artist.dto";
import { GetAllArtistDto } from "./dto/request/get-all-artist.dto";
import { UpdateArtistDto } from "./dto/request/update-artist.dto";
import { ArtistListResponseDto } from "./dto/response/artist-list.response.dto";
import { ArtistResponseDto } from "./dto/response/artist-response.dto";

@ApiTags("artists")
@Controller("artist")
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @ApiOperation({ summary: "Create an artist" })
  @ApiCreatedResponse({ type: ArtistResponseDto })
  @AdminOnly()
  @Post()
  create(@Body() data: CreateArtistDto) {
    return this.artistService.create(data);
  }

  @ApiOperation({
    summary: "List artists with filter, sort, and pagination",
    description:
      "`filter` (repeatable): `property:rule:value`. Filterable: name. `sort`: `property:direction`. Sortable: name, createdAt.",
  })
  @ApiOkResponse({ type: ArtistListResponseDto })
  @Get()
  findAll(
    @Query() query: GetAllArtistDto,
    @SortingParams(["name", "createdAt"]) sort?: Sorting,
    @FilteringParams(["name"]) filters?: Filter[],
  ) {
    return this.artistService.findAll(query, sort, filters);
  }

  @ApiOperation({ summary: "Get an artist by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ArtistResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const artist = await this.artistService.findOne(id);

    if (!artist) throw new NotFoundException(`Artist with id ${id} not found`);

    return artist;
  }

  @ApiOperation({ summary: "Update an artist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ArtistResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @AdminOnly()
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() data: UpdateArtistDto) {
    return this.artistService.update(id, data);
  }

  @ApiOperation({ summary: "Delete an artist and cascade-delete its cast credits" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ArtistResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @AdminOnly()
  @Delete(":id")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.artistService.delete(id);
  }
}
