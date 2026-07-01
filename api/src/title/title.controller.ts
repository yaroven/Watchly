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
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleService } from "./title.service";

@Controller("title")
export class TitleController {
  constructor(private readonly titleService: TitleService) {}

  @Post()
  create(@Body() data: CreateTitleDto) {
    return this.titleService.create(data);
  }

  @Get(":id/video")
  getMovie(@Param("id") id: string) {
    return this.titleService.getMovieUrl(id);
  }

  @Get()
  findAll(@Query() query: GetAllTitleDto) {
    return this.titleService.findAll(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const title = await this.titleService.findOne(id);

    if (!title) throw new NotFoundException(`Title with id ${id} not found`);

    return title;
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() data: UpdateTitleDto) {
    return this.titleService.update(id, data);
  }

  @Get(":id/upload-url")
  getUploadUrl(@Param("id") id: string) {
    return this.titleService.createMovieUploadingUrl(id);
  }

  @Get(":id/poster-upload-url")
  getPosterUploadUrl(@Param("id") id: string) {
    return this.titleService.createPosterUploadingUrl(id);
  }

  @Post(":id/transcode")
  transcodeMovie(@Param("id") id: string) {
    return this.titleService.transcode(id);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.titleService.delete(id);
  }
}
