import { Body, Controller, Delete, Param, ParseUUIDPipe, Post } from "@nestjs/common";
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
import { EpisodeExistsPipe } from "../episode/utils/episode-exists.pipe";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { MediaAssetService } from "./media-asset.service";

/// An episode's raw file and its transcode. The playback URL is **not** here:
/// building it needs the episode's season and title, which only the episode
/// module can resolve — see `EpisodeController.getStreamUrl`.
///
/// Kept on the `episode` prefix and the `episodes` tag so the URLs and the
/// Swagger section do not move with the module.
@ApiTags("episodes")
@Controller("episodes")
export class EpisodeMediaController {
  constructor(private readonly mediaAssetService: MediaAssetService) {}

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

  /// No existence check, as before: aborting a multipart upload for an episode
  /// that has since been deleted has to go through, or the parts leak in S3.
  @ApiOperation({ summary: "Abort a multipart upload for the raw episode file" })
  @ApiParam({ name: "id", format: "uuid" })
  @AdminOnly()
  @Delete(":id/upload-url/:uploadId")
  abortUpload(@Param("id", ParseUUIDPipe) id: string, @Param("uploadId") uploadId: string) {
    return this.mediaAssetService.abortUpload(id, uploadId, VideoType.EPISODE);
  }
}
