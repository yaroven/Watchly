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
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  type Locale,
  TRANSLATION_LOCALES,
  type TranslationLocale,
} from "../../../common/locale.const";
import { Filter, Sorting } from "../../../common/pagination/pagination.types";
import { TranslationLocalePipe } from "../../../common/utils/translation-locale.pipe";
import { VaryAcceptLanguageInterceptor } from "../../../common/utils/vary-accept-language.interceptor";
import { FilteringParams } from "../../../decorators/filtering-params.decorator";
import { RequestLocale } from "../../../decorators/request-locale.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { SortingParams } from "../../../decorators/sorting-params.decorator";
import { GenreService } from "../../../services/genre/genre.service";
import { GenreExistsPipe } from "../../../services/genre/utils/genre-exists.pipe";
import { Paginated, PaginatedResponseOf } from "../../dto/paginated-response-of.util";
import { GenreTranslationDto } from "../../dto/request/translation.dto";
import { GenreTranslationResponseDto } from "../../dto/response/translation-response.dto";
import { CreateGenreDto } from "./dto/request/create-genre.dto";
import { GetAllGenreDto } from "./dto/request/get-all-genre.dto";
import { UpdateGenreDto } from "./dto/request/update-genre.dto";
import { GenreResponseDto } from "./dto/response/genre-response.dto";

@ApiTags("genres")
@ApiHeader({
  name: "Accept-Language",
  required: false,
  description: "Language of genre names in reads (en, uk); English when absent or unsupported",
})
@UseInterceptors(VaryAcceptLanguageInterceptor)
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
    @RequestLocale() locale: Locale,
    @SortingParams(["name", "createdAt"]) sort?: Sorting,
    @FilteringParams(["name"]) filters?: Filter[],
  ): Promise<Paginated<GenreResponseDto>> {
    return this.genreService.findAll(query, locale, sort, filters);
  }

  @ApiOperation({ summary: "Get a genre by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: GenreResponseDto })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @RequestLocale() locale: Locale,
  ): Promise<GenreResponseDto> {
    const genre = await this.genreService.findOne(id, locale);

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

  @ApiOperation({ summary: "List every translation of a genre" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [GenreTranslationResponseDto] })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @AdminOnly()
  @Get(":id/translations")
  listTranslations(
    @Param("id", ParseUUIDPipe, GenreExistsPipe) id: string,
  ): Promise<GenreTranslationResponseDto[]> {
    return this.genreService.listTranslations(id);
  }

  @ApiOperation({
    summary: "Create or replace a genre's translation",
    description: "English is edited on the genre itself; `:locale` takes only translation locales.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "locale", enum: TRANSLATION_LOCALES })
  @ApiOkResponse({ type: GenreTranslationResponseDto })
  @ApiBadRequestResponse({
    description: "Unsupported or English locale, or an incomplete translation",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @AdminOnly()
  @Put(":id/translations/:locale")
  upsertTranslation(
    @Param("id", ParseUUIDPipe, GenreExistsPipe) id: string,
    @Param("locale", TranslationLocalePipe) locale: TranslationLocale,
    @Body() data: GenreTranslationDto,
  ): Promise<GenreTranslationResponseDto> {
    return this.genreService.upsertTranslation(id, locale, data);
  }

  @ApiOperation({ summary: "Delete a genre's translation; succeeds when there is none" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "locale", enum: TRANSLATION_LOCALES })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: "Unsupported or English locale" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Genre not found" })
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id/translations/:locale")
  removeTranslation(
    @Param("id", ParseUUIDPipe, GenreExistsPipe) id: string,
    @Param("locale", TranslationLocalePipe) locale: TranslationLocale,
  ): Promise<void> {
    return this.genreService.removeTranslation(id, locale);
  }
}
