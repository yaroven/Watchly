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
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { UrlResponseDto } from "../common/dto/url-response.dto";
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
  @Roles([Role.ADMIN])
  @Post()
  async create(@Body() createEpisodeDto: CreateEpisodeDto) {
    const episode = await this.episodeService.create(createEpisodeDto);
    return new EpisodeResponseDto(episode);
  }

  @ApiOperation({ summary: "List episodes, optionally filtered by season" })
  @ApiQuery({ name: "seasonId", required: false, format: "uuid" })
  @ApiOkResponse({ type: [EpisodeResponseDto] })
  @Get()
  async findAll(@Query("seasonId") seasonId?: string) {
    const episodes = await this.episodeService.findAll(seasonId);
    return episodes.map((episode) => new EpisodeResponseDto(episode));
  }

  @ApiOperation({ summary: "Get an episode by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const episode = await this.episodeService.findOne(id);

    if (!episode) throw new NotFoundException(`Episode with id ${id} not found`);

    return new EpisodeResponseDto(episode);
  }

  @ApiOperation({ summary: "Update an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Roles([Role.ADMIN])
  @Patch(":id")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() updateEpisodeDto: UpdateEpisodeDto) {
    const episode = await this.episodeService.update(id, updateEpisodeDto);
    return new EpisodeResponseDto(episode);
  }

  @ApiOperation({ summary: "Delete an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: EpisodeResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Roles([Role.ADMIN])
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    const episode = await this.episodeService.delete(id);
    return new EpisodeResponseDto(episode);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for an episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Roles([Role.ADMIN])
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe) id: string) {
    return this.episodeService.transcode(id);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Episode not found" })
  @Roles([Role.ADMIN])
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
