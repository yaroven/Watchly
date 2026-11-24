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
import { Throttle } from "@nestjs/throttler";
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
import { EpisodeExistsPipe } from "../../../services/episode/utils/episode-exists.pipe";
import { CompleteMultipartUploadDto } from "../../dto/request/complete-multipart-upload.dto";
import { StartMultipartUploadDto } from "../../dto/request/start-multipart-upload.dto";
import { NameDescriptionTranslationDto } from "../../dto/request/translation.dto";
import { MultipartUploadResponseDto } from "../../dto/response/multipart-upload-response.dto";
import { NameDescriptionTranslationResponseDto } from "../../dto/response/translation-response.dto";
import { UrlResponseDto } from "../../dto/url-response.dto";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { EpisodeResponseDto } from "./dto/response/episode-response.dto";
import { EpisodesService } from "./episodes.service";

@ApiTags("episodes")
@ApiHeader({
  name: "Accept-Language",
  required: false,
  description:
    "Language of episode names and descriptions in reads (en, uk); English when absent or unsupported. " +
    "Creates and updates always answer in English.",
})
@UseInterceptors(VaryAcceptLanguageInterceptor)
@Controller("episodes")
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @ApiOperation({ summary: "Create an episode for a season" })
  @ApiCreatedResponse({ type: EpisodeResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() createEpisodeDto: CreateEpisodeDto): Promise<EpisodeResponseDto> {
    return this.episodesService.create(createEpisodeDto);
  }

  @ApiOperation({
    summary: "List episodes, filterable and sortable",
    description:
      "`filter` (repeatable): `property:rule:value`, e.g. `filter=seasonId:eq:<uuid>`. Filterable: seasonId, number, name. " +
      "`sort`: `property:direction`, defaults to number:asc. Sortable: number, name, createdAt.",
  })
  @ApiOkResponse({ type: [EpisodeResponseDto] })
  @Get()
  async findAll(
    @FilteringParams(["seasonId", "number", "name"]) filters: Filter[],
    @RequestLocale() locale: Locale,
    @SortingParams(["number", "name", "createdAt"]) sort?: Sorting,
  ): Promise<EpisodeResponseDto[]> {
    return this.episodesService.findAll(locale, filters, sort);
  }

  @ApiOperation({ summary: "Get an episode by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @RequestLocale() locale: Locale,
  ): Promise<EpisodeResponseDto> {
    const episode = await this.episodesService.findOne(id, locale);

    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    return episode;
  }

  @ApiOperation({ summary: "Update an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateEpisodeDto: UpdateEpisodeDto,
  ): Promise<EpisodeResponseDto> {
    return this.episodesService.update(id, updateEpisodeDto);
  }

  @ApiOperation({ summary: "Delete an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<EpisodeResponseDto> {
    return this.episodesService.delete(id);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id/video")
  getStreamUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodesService.getStreamUrl(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string) {
    return this.episodesService.scheduleTranscode(id);
  }

  @ApiOperation({ summary: "Start a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: MultipartUploadResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/upload-url")
  startUpload(
    @Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string,
    @Body() dto: StartMultipartUploadDto,
  ) {
    return this.episodesService.startUpload(id, dto.fileSize);
  }

  @ApiOperation({ summary: "Complete a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Post(":id/upload-url/complete")
  completeUpload(
    @Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string,
    @Body() dto: CompleteMultipartUploadDto,
  ) {
    return this.episodesService.completeUpload(id, dto.uploadId, dto.parts);
  }

  @ApiOperation({ summary: "Abort a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.episodesService.abortUpload(id, uploadId);
  }

  @ApiOperation({ summary: "List every translation of a episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [NameDescriptionTranslationResponseDto] })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Get(":id/translations")
  listTranslations(
    @Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string,
  ): Promise<NameDescriptionTranslationResponseDto[]> {
    return this.episodesService.listTranslations(id);
  }

  @ApiOperation({
    summary: "Create or replace a episode's translation",
    description:
      "English is edited on the episode itself; `:locale` takes only translation locales.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "locale", enum: TRANSLATION_LOCALES })
  @ApiOkResponse({ type: NameDescriptionTranslationResponseDto })
  @ApiBadRequestResponse({
    description: "Unsupported or English locale, or an incomplete translation",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Put(":id/translations/:locale")
  upsertTranslation(
    @Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string,
    @Param("locale", TranslationLocalePipe) locale: TranslationLocale,
    @Body() data: NameDescriptionTranslationDto,
  ): Promise<NameDescriptionTranslationResponseDto> {
    return this.episodesService.upsertTranslation(id, locale, data);
  }

  @ApiOperation({ summary: "Delete a episode's translation; succeeds when there is none" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "locale", enum: TRANSLATION_LOCALES })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: "Unsupported or English locale" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id/translations/:locale")
  removeTranslation(
    @Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string,
    @Param("locale", TranslationLocalePipe) locale: TranslationLocale,
  ): Promise<void> {
    return this.episodesService.removeTranslation(id, locale);
  }
}
