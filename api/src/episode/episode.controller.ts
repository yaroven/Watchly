import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Episode } from "@prisma/client";
import { CreateEpisodeDto } from "./dto/request/create-episode.dto";
import { UpdateEpisodeDto } from "./dto/request/update-episode.dto";
import { EpisodeService } from "./episode.service";

@Controller("episode")
export class EpisodeController {
  constructor(private readonly episodeService: EpisodeService) {}

  @Post()
  create(@Body() createEpisodeDto: CreateEpisodeDto) {
    return this.episodeService.create(createEpisodeDto);
  }

  @Get()
  findAll(@Query("seasonId") seasonId?: string) {
    return this.episodeService.findAll(seasonId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Episode> {
    const episode = await this.episodeService.findOne(id);

    if (!episode) {
      throw new NotFoundException(`Episode with id ${id} not found`);
    }

    return episode;
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateEpisodeDto: UpdateEpisodeDto) {
    return this.episodeService.update(id, updateEpisodeDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.episodeService.remove(id);
  }

  @Post(":id/transcode")
  transcode(@Param("id") id: string) {
    return this.episodeService.transcode(id);
  }

  @Get(":id/upload-url")
  getUploadUrl(@Param("id") id: string) {
    return this.episodeService.getUploadUrl(id);
  }

  @Get(":id/video")
  getStreamUrl(@Param("id") id: string) {
    return this.episodeService.getStreamUrl(id);
  }
}
