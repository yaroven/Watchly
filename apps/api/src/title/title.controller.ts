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
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { UrlResponseDto } from "../common/dto/url-response.dto";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleListResponseDto } from "./dto/response/title-list.response.dto";
import { TitleEntity } from "./entities/title.entity";
import { TitleService } from "./title.service";

@ApiTags("titles")
@Controller("title")
export class TitleController {
  constructor(private readonly titleService: TitleService) {}

  @ApiOperation({ summary: "Create a title (movie or series)" })
  @ApiCreatedResponse({ type: TitleEntity })
  @Post()
  create(@Body() data: CreateTitleDto) {
    return this.titleService.create(data);
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
  findAll(@Query() query: GetAllTitleDto) {
    return this.titleService.findAll(query);
  }

  @ApiOperation({ summary: "Get a title by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEntity })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const title = await this.titleService.findOne(id);

    if (!title) throw new NotFoundException(`Title with id ${id} not found`);

    return title;
  }

  @ApiOperation({ summary: "Update a title" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEntity })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() data: UpdateTitleDto) {
    return this.titleService.update(id, data);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Get(":id/upload-url")
  getUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.createMovieUploadingUrl(id);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the title's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Get(":id/poster-upload-url")
  getPosterUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.createPosterUploadingUrl(id);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/transcode")
  transcodeMovie(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.transcode(id);
  }

  @ApiOperation({ summary: "Delete a title and cascade-delete its seasons/episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: TitleEntity })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Delete(":id")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.titleService.delete(id);
  }
}
