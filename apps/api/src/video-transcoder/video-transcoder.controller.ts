import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { VideoTranscodingProgressEntity } from "./entities/video-transcoding-progress.entity";
import { VideoType } from "./enums/video-type.enum";
import { VideoTranscoderService } from "./video-transcoder.service";

@ApiTags("video-transcoder")
@Controller("video-transcoder")
export class VideoTranscoderController {
  constructor(private readonly videoTranscoderService: VideoTranscoderService) {}

  @ApiOperation({ summary: "Get transcoding progress for a movie or episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiQuery({ name: "type", enum: VideoType })
  @ApiOkResponse({ type: VideoTranscodingProgressEntity })
  @ApiNotFoundResponse({ description: "Progress not found" })
  @Get("progress/:id")
  async getProgress(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("type", new ParseEnumPipe(VideoType)) type: VideoType,
  ) {
    const progress = await this.videoTranscoderService.getProgress(id, type);

    if (!progress) {
      throw new NotFoundException(`Progress for ${type} ${id} not found`);
    }

    return progress;
  }
}
