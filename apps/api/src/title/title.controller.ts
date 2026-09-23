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
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { UrlResponseDto } from "../common/dto/url-response.dto";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleListResponseDto } from "./dto/response/title-list.response.dto";
import { TitleResponseDto } from "./dto/response/title-response.dto";
import { TitleService } from "./title.service";

@ApiTags("titles")
@Controller("title")
export class TitleController {
  constructor(private readonly titleService: TitleService) {}

  @ApiOperation({ summary: "Create a title (movie or series)" })
  @ApiCreatedResponse({ type: TitleResponseDto })
  @Roles([Role.ADMIN])
  @Post()
  async create(@Body() data: CreateTitleDto) {
    const title = await this.titleService.create(data);
    return new TitleResponseDto(title);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @Get(":id/video")
  getMovie(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.getMovieUrl(id);
  }

  @ApiOperation({ summary: "List titles with search, filter, sort, and pagination" })
  @ApiOkResponse({ type: TitleListResponseDto })
  @Get()
  async findAll(@Query() query: GetAllTitleDto) {
    const { items, totalCount } = await this.titleService.findAll(query);
    return { items: items.map((title) => new TitleResponseDto(title)), totalCount };
  }

  @ApiOperation({ summary: "Get a title by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const title = await this.titleService.findOne(id);

    if (!title) throw new NotFoundException(`Title with id ${id} not found`);

    return new TitleResponseDto(title);
  }

  @ApiOperation({ summary: "Update a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Roles([Role.ADMIN])
  @Patch(":id")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() data: UpdateTitleDto) {
    const title = await this.titleService.update(id, data);
    return new TitleResponseDto(title);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Roles([Role.ADMIN])
  @Get(":id/upload-url")
  getUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.createMovieUploadingUrl(id);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the title's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Roles([Role.ADMIN])
  @Get(":id/poster-upload-url")
  getPosterUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.createPosterUploadingUrl(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Roles([Role.ADMIN])
  @Post(":id/transcode")
  transcodeMovie(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.transcode(id);
  }

  @ApiOperation({ summary: "Delete a title and cascade-delete its seasons/episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Roles([Role.ADMIN])
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    const title = await this.titleService.delete(id);
    return new TitleResponseDto(title);
  }
}
