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
import { CompleteMultipartUploadDto } from "../common/dto/request/complete-multipart-upload.dto";
import { StartMultipartUploadDto } from "../common/dto/request/start-multipart-upload.dto";
import { MultipartUploadResponseDto } from "../common/dto/response/multipart-upload-response.dto";
import { UrlResponseDto } from "../common/dto/url-response.dto";
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { EpisodeResponseDto } from "./dto/response/episode-response.dto";
import { EpisodeService } from "./episode.service";

@ApiTags("episodes")
@Controller("episode")
export class EpisodeController {
  constructor(private readonly episodeService: EpisodeService) {}

  @ApiOperation({ summary: "Create an episode for a season" })
  @ApiCreatedResponse({ type: EpisodeResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() createEpisodeDto: CreateEpisodeDto) {
    return this.episodeService.create(createEpisodeDto);
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
    @SortingParams(["number", "name", "createdAt"]) sort?: Sorting,
  ) {
    return this.episodeService.findAll(filters, sort);
  }

  @ApiOperation({ summary: "Get an episode by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const episode = await this.episodeService.findOne(id);

    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    return episode;
  }

  @ApiOperation({ summary: "Update an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Patch(":id")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() updateEpisodeDto: UpdateEpisodeDto) {
    return this.episodeService.update(id, updateEpisodeDto);
  }

  @ApiOperation({ summary: "Delete an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.delete(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.transcode(id);
  }

  @ApiOperation({ summary: "Start a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: MultipartUploadResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/upload-url")
  startUpload(@Param("id", ParseUUIDPipe) id: string, @Body() dto: StartMultipartUploadDto) {
    return this.episodeService.startUpload(id, dto.fileSize);
  }

  @ApiOperation({ summary: "Complete a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Post(":id/upload-url/complete")
  completeUpload(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CompleteMultipartUploadDto) {
    return this.episodeService.completeUpload(id, dto.uploadId, dto.parts);
  }

  @ApiOperation({ summary: "Abort a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.episodeService.abortUpload(id, uploadId);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id/video")
  getStreamUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.getStreamUrl(id);
  }
}
