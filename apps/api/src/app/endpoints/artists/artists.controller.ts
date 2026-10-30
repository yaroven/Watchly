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
import { ArtistService } from "../../../services/artist/artist.service";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { Paginated, PaginatedResponseOf } from "../../dto/paginated-response-of.util";
import { CreateArtistDto } from "./dto/request/create-artist.dto";
import { GetAllArtistDto } from "./dto/request/get-all-artist.dto";
import { UpdateArtistDto } from "./dto/request/update-artist.dto";
import { ArtistFilmographyItemDto } from "./dto/response/artist-filmography-item.dto";
import { ArtistResponseDto } from "./dto/response/artist-response.dto";

@ApiTags("artists")
@Controller("artists")
export class ArtistsController {
  constructor(private readonly artistService: ArtistService) {}

  @ApiOperation({ summary: "Create an artist" })
  @ApiCreatedResponse({ type: ArtistResponseDto })
  @AdminOnly()
  @Post()
  create(@Body() data: CreateArtistDto): Promise<ArtistResponseDto> {
    return this.artistService.create(data);
  }

  @ApiOperation({
    summary: "List artists with filter, sort, and pagination",
    description:
      "`filter` (repeatable): `property:rule:value`. Filterable: name. `sort`: `property:direction`. Sortable: name, createdAt.",
  })
  @ApiOkResponse({ type: PaginatedResponseOf(ArtistResponseDto) })
  @Get()
  findAll(
    @Query() query: GetAllArtistDto,
    @SortingParams(["name", "createdAt"]) sort?: Sorting,
    @FilteringParams(["name"]) filters?: Filter[],
  ): Promise<Paginated<ArtistResponseDto>> {
    return this.artistService.findAll(query, sort, filters);
  }

  @ApiOperation({ summary: "Get an artist by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ArtistResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ArtistResponseDto> {
    const artist = await this.artistService.findOne(id);

    if (!artist) throw new NotFoundException(`Artist with id ${id} not found`);

    return artist;
  }

  @ApiOperation({ summary: "Get the titles an artist is credited on" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [ArtistFilmographyItemDto] })
  @Get(":id/filmography")
  getFilmography(@Param("id", ParseUUIDPipe) id: string): Promise<ArtistFilmographyItemDto[]> {
    return this.artistService.getFilmography(id);
  }

  @ApiOperation({ summary: "Update an artist" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ArtistResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @AdminOnly()
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe, ArtistExistsPipe) id: string,
    @Body() data: UpdateArtistDto,
  ): Promise<ArtistResponseDto> {
    return this.artistService.update(id, data);
  }

  @ApiOperation({ summary: "Delete an artist and cascade-delete its cast credits" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ArtistResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @AdminOnly()
  @Delete(":id")
  delete(@Param("id", ParseUUIDPipe, ArtistExistsPipe) id: string): Promise<ArtistResponseDto> {
    return this.artistService.delete(id);
  }
}
