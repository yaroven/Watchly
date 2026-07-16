import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { VideoType } from "./enums/video-type.enum";
import { VideoTranscoderService } from "./video-transcoder.service";

@Controller("video-transcoder")
export class VideoTranscoderController {
  constructor(private readonly videoTranscoderService: VideoTranscoderService) {}

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
