import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
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
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { MediaAssetService } from "./media-asset.service";

@ApiTags("titles")
@Controller("titles")
export class TitleMediaController {
  constructor(private readonly mediaAssetService: MediaAssetService) {}

  @ApiOperation({ summary: "Start a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: MultipartUploadResponseDto })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Post(":id/upload-url")
  startUpload(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() dto: StartMultipartUploadDto,
  ) {
    return this.mediaAssetService.startUpload(id, dto.fileSize, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Complete a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Post(":id/upload-url/complete")
  completeUpload(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() dto: CompleteMultipartUploadDto,
  ) {
    return this.mediaAssetService.completeUpload(id, dto.uploadId, dto.parts, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Abort a multipart upload for the raw movie file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.mediaAssetService.abortUpload(id, uploadId, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Schedule HLS transcoding for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Transcoding scheduled" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @AdminOnly()
  @Post(":id/transcode")
  transcode(@Param("id", ParseUUIDPipe, TitleExistsPipe) id: string) {
    return this.mediaAssetService.scheduleTranscode(id, VideoType.MOVIE);
  }

  @ApiOperation({ summary: "Get a presigned playback URL for a movie" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UrlResponseDto })
  @ApiNotFoundResponse({ description: "This title has no playable media yet" })
  @Get(":id/video")
  getPlaybackUrl(@Param("id", ParseUUIDPipe) id: string) {
    return this.mediaAssetService.getPlaybackUrl({ type: VideoType.MOVIE, titleId: id });
  }
}
