import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { PosterService } from "../../../services/poster/poster.service";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { UploadUrlResponseDto } from "../../dto/upload-url-response.dto";

@ApiTags("titles")
@Controller("titles")
export class TitlePosterController {
  constructor(private readonly posterService: PosterService) {}

  @ApiOperation({ summary: "Get a presigned URL to upload the title's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Get(":id/poster-upload-url")
  getUploadUrl(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
  ): Promise<UploadUrlResponseDto> {
    return this.posterService.createUploadUrl("titles", id);
  }
}

@ApiTags("seasons")
@Controller("seasons")
export class SeasonPosterController {
  constructor(private readonly posterService: PosterService) {}

  @ApiOperation({ summary: "Get a presigned URL to upload the season's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Season not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Get(":id/poster-upload-url")
  getUploadUrl(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
  ): Promise<UploadUrlResponseDto> {
    return this.posterService.createUploadUrl("seasons", id);
  }
}

@ApiTags("artists")
@Controller("artists")
export class ArtistPosterController {
  constructor(private readonly posterService: PosterService) {}

  @ApiOperation({ summary: "Get a presigned upload URL for an artist's photo" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Get(":id/photo-upload-url")
  getUploadUrl(
    @Param("id", ParseUUIDPipe, ArtistExistsPipe) id: string,
  ): Promise<UploadUrlResponseDto> {
    return this.posterService.createUploadUrl("artists", id);
  }
}
