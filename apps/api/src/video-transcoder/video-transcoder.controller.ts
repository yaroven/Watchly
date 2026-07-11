import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { VideoType } from "./enums/video-type.enum";
import { VideoTranscoderService } from "./video-transcoder.service";

@Controller("video-transcoder")
export class VideoTranscoderController {
  constructor(private readonly videoTranscoderService: VideoTranscoderService) {}

  @Get("progress/:id")
  async getProgress(@Param("id") id: string, @Query("type") type: string) {
    const videoType = type?.toUpperCase() === "EPISODE" ? VideoType.EPISODE : VideoType.MOVIE;

    const progress = await this.videoTranscoderService.getProgress(id, videoType);

    if (!progress) {
      throw new NotFoundException(`Progress for ${type} ${id} not found`);
    }

    return progress;
  }
}
