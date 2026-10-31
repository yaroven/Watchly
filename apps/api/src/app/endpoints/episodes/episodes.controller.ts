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
import { Filter, Sorting } from "../../../common/pagination/pagination.types";
import { FilteringParams } from "../../../decorators/filtering-params.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { SortingParams } from "../../../decorators/sorting-params.decorator";
import { EpisodeService } from "../../../services/episode/episode.service";
import { EpisodeExistsPipe } from "../../../services/episode/utils/episode-exists.pipe";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { CompleteMultipartUploadDto } from "../../dto/request/complete-multipart-upload.dto";
import { StartMultipartUploadDto } from "../../dto/request/start-multipart-upload.dto";
import { MultipartUploadResponseDto } from "../../dto/response/multipart-upload-response.dto";
import { UrlResponseDto } from "../../dto/url-response.dto";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { EpisodeResponseDto } from "./dto/response/episode-response.dto";

@ApiTags("episodes")
@Controller("episodes")
export class EpisodesController {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  @ApiOperation({ summary: "Create an episode for a season" })
  @ApiCreatedResponse({ type: EpisodeResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() createEpisodeDto: CreateEpisodeDto): Promise<EpisodeResponseDto> {
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
  ): Promise<EpisodeResponseDto[]> {
    return this.episodeService.findAll(filters, sort);
  }

  @ApiOperation({ summary: "Get an episode by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<EpisodeResponseDto> {
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
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateEpisodeDto: UpdateEpisodeDto,
  ): Promise<EpisodeResponseDto> {
    return this.episodeService.update(id, updateEpisodeDto);
  }

  @ApiOperation({ summary: "Delete an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<EpisodeResponseDto> {
    return this.episodeService.delete(id);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id/video")
  getStreamUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.getStreamUrl(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe, EpisodeExistsPipe) id: string) {
    return this.mediaAssetService.scheduleTranscode(id, VideoType.EPISODE);
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
    return this.mediaAssetService.startUpload(id, dto.fileSize, VideoType.EPISODE);
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
    return this.mediaAssetService.completeUpload(id, dto.uploadId, dto.parts, VideoType.EPISODE);
  }

  @ApiOperation({ summary: "Abort a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.mediaAssetService.abortUpload(id, uploadId, VideoType.EPISODE);
  }
}
