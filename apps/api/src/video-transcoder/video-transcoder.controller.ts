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
import { Auth } from "../auth/decorators/auth.decorator";
import { VideoTranscodingProgressResponseDto } from "./dto/response/video-transcoding-progress-response.dto";
import { VideoType } from "./enums/video-type.enum";
import { VideoTranscoderService } from "./video-transcoder.service";

@ApiTags("video-transcoder")
@Auth()
@Controller("video-transcoder")
export class VideoTranscoderController {
  constructor(private readonly videoTranscoderService: VideoTranscoderService) {}

  @ApiOperation({ summary: "Get transcoding progress for a movie or episode" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiQuery({ name: "type", enum: VideoType })
  @ApiOkResponse({ type: VideoTranscodingProgressResponseDto })
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

    return new VideoTranscodingProgressResponseDto(progress);
  }
}
