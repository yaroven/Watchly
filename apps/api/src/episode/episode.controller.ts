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
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Episode } from "@prisma/client";
import { UrlResponseDto } from "../common/dto/url-response.dto";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { EpisodeEntity } from "./entities/episode.entity";
import { EpisodeService } from "./episode.service";

@ApiTags("episodes")
@Controller("episode")
export class EpisodeController {
  constructor(private readonly episodeService: EpisodeService) {}

  @ApiOperation({ summary: "Create an episode for a season" })
  @ApiCreatedResponse({ type: EpisodeEntity })
  @Post()
  create(@Body() createEpisodeDto: CreateEpisodeDto) {
    return this.episodeService.create(createEpisodeDto);
  }

  @ApiOperation({ summary: "List episodes, optionally filtered by season" })
  @ApiQuery({ name: "seasonId", required: false, format: "uuid" })
  @ApiOkResponse({ type: [EpisodeEntity] })
  @Get()
  findAll(@Query("seasonId") seasonId?: string) {
    return this.episodeService.findAll(seasonId);
  }

  @ApiOperation({ summary: "Get an episode by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeEntity })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Episode> {
    const episode = await this.episodeService.findOne(id);

    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    return episode;
  }

  @ApiOperation({ summary: "Update an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeEntity })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() updateEpisodeDto: UpdateEpisodeDto) {
    return this.episodeService.update(id, updateEpisodeDto);
  }

  @ApiOperation({ summary: "Delete an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeEntity })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Delete(":id")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.delete(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.transcode(id);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Get(":id/upload-url")
  getUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.getUploadUrl(id);
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
