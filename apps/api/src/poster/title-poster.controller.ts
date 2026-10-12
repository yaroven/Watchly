import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { UploadUrlResponseDto } from "../common/dto/upload-url-response.dto";
import { SeasonExistsPipe } from "../season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { PosterService } from "./poster.service";

/// Only the upload URL lives here. Reading a poster back is not a route — the key
/// is resolved into a URL as part of the title response — and confirming an upload
/// is part of handling `PATCH /titles/:id`, not a call of its own.
///
/// Kept on the `title` prefix and the `titles` tag so the URL and the Swagger
/// section do not move with the module.
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
  getUploadUrl(@Param("id", ParseUUIDPipe, TitleExistsPipe) id: string) {
    return this.posterService.createUploadUrl("titles", id);
  }
}

/// Same route on the season prefix. A second class rather than a parameterised
/// one because the kind decides which pipe runs, and a pipe is chosen at
/// decoration time, not per request.
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
  getUploadUrl(@Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string) {
    return this.posterService.createUploadUrl("seasons", id);
  }
}
