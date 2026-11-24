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
import { SeasonService } from "../../../services/season/season.service";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { NameDescriptionTranslationDto } from "../../dto/request/translation.dto";
import { NameDescriptionTranslationResponseDto } from "../../dto/response/translation-response.dto";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonResponseDto } from "./dto/response/season-response.dto";

@ApiTags("seasons")
@ApiHeader({
  name: "Accept-Language",
  required: false,
  description:
    "Language of season names and descriptions in reads (en, uk); English when absent or unsupported. " +
    "Creates and updates always answer in English.",
})
@UseInterceptors(VaryAcceptLanguageInterceptor)
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
    @RequestLocale() locale: Locale,
    @SortingParams(["number", "name", "createdAt"]) sort?: Sorting,
  ): Promise<SeasonResponseDto[]> {
    return this.seasonService.findAll(locale, filters, sort);
  }

  @ApiOperation({ summary: "Get a season by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @RequestLocale() locale: Locale,
  ): Promise<SeasonResponseDto> {
    const season = await this.seasonService.findOne(id, locale);

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

  @ApiOperation({ summary: "List every translation of a season" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [NameDescriptionTranslationResponseDto] })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Get(":id/translations")
  listTranslations(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
  ): Promise<NameDescriptionTranslationResponseDto[]> {
    return this.seasonService.listTranslations(id);
  }

  @ApiOperation({
    summary: "Create or replace a season's translation",
    description:
      "English is edited on the season itself; `:locale` takes only translation locales.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "locale", enum: TRANSLATION_LOCALES })
  @ApiOkResponse({ type: NameDescriptionTranslationResponseDto })
  @ApiBadRequestResponse({
    description: "Unsupported or English locale, or an incomplete translation",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Put(":id/translations/:locale")
  upsertTranslation(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
    @Param("locale", TranslationLocalePipe) locale: TranslationLocale,
    @Body() data: NameDescriptionTranslationDto,
  ): Promise<NameDescriptionTranslationResponseDto> {
    return this.seasonService.upsertTranslation(id, locale, data);
  }

  @ApiOperation({ summary: "Delete a season's translation; succeeds when there is none" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "locale", enum: TRANSLATION_LOCALES })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: "Unsupported or English locale" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id/translations/:locale")
  removeTranslation(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
    @Param("locale", TranslationLocalePipe) locale: TranslationLocale,
  ): Promise<void> {
    return this.seasonService.removeTranslation(id, locale);
  }
}
