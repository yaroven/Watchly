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
import { CreateGenreDto } from "./dto/request/create-genre.dto";
import { GetAllGenreDto } from "./dto/request/get-all-genre.dto";
import { UpdateGenreDto } from "./dto/request/update-genre.dto";
import { GenreListResponseDto } from "./dto/response/genre-list.response.dto";
import { GenreResponseDto } from "./dto/response/genre-response.dto";
import { GenreService } from "./genre.service";

@ApiTags("genres")
@Controller("genre")
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  @ApiOperation({ summary: "Create a genre" })
  @ApiCreatedResponse({ type: GenreResponseDto })
  @AdminOnly()
  @Post()
  create(@Body() data: CreateGenreDto) {
    return this.genreService.create(data);
  }

  @ApiOperation({ summary: "List genres with search, sort, and pagination" })
  @ApiOkResponse({ type: GenreListResponseDto })
  @Get()
  findAll(@Query() query: GetAllGenreDto) {
    return this.genreService.findAll(query);
  }

  @ApiOperation({ summary: "Get a genre by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: GenreResponseDto })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
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
  update(@Param("id", ParseUUIDPipe) id: string, @Body() data: UpdateGenreDto) {
    return this.genreService.update(id, data);
  }

  @ApiOperation({ summary: "Delete a genre" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: GenreResponseDto })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @AdminOnly()
  @Delete(":id")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.genreService.delete(id);
  }
}
