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
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";
import { SeasonService } from "./season.service";

@Controller("season")
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Post()
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonService.create(createSeasonDto);
  }

  @Get()
  findAll(@Query("titleId") titleId?: string) {
    return this.seasonService.findAll(titleId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const season = await this.seasonService.findOne(id);

    if (!season) {
      throw new NotFoundException(`Season with id ${id} not found`);
    }

    return season;
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateSeasonDto: UpdateSeasonDto) {
    return this.seasonService.update(id, updateSeasonDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.seasonService.remove(id);
  }
}
