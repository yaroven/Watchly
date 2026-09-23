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
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonResponseDto } from "./dto/response/season-response.dto";
import { SeasonService } from "./season.service";

@ApiTags("seasons")
@Controller("season")
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @ApiOperation({ summary: "Create a season for a title" })
  @ApiCreatedResponse({ type: SeasonResponseDto })
  @AdminOnly()
  @Post()
  async create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonService.create(createSeasonDto);
  }

  @ApiOperation({ summary: "List seasons, optionally filtered by title" })
  @ApiQuery({ name: "titleId", required: false, format: "uuid" })
  @ApiOkResponse({ type: [SeasonResponseDto] })
  @Get()
  async findAll(@Query("titleId") titleId?: string) {
    return this.seasonService.findAll(titleId);
  }

  @ApiOperation({ summary: "Get a season by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const season = await this.seasonService.findOne(id);

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
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() updateSeasonDto: UpdateSeasonDto) {
    return this.seasonService.update(id, updateSeasonDto);
  }

  @ApiOperation({ summary: "Get a presigned URL to upload the season's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Get(":id/poster-upload-url")
  getPosterUploadUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.seasonService.createPosterUploadingUrl(id);
  }

  @ApiOperation({ summary: "Delete a season and cascade-delete its episodes" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: SeasonResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.seasonService.delete(id);
  }
}
