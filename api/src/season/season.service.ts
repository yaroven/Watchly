import { Injectable } from "@nestjs/common";
import { Season } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { S3Service } from "../S3/S3.service";
import { CreateSeasonDto } from "./dto/request/create-season.dto";
import { UpdateSeasonDto } from "./dto/request/update-season.dto";

@Injectable()
export class SeasonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async create(data: CreateSeasonDto): Promise<Season> {
    return this.prisma.season.create({ data });
  }

  async findAll(titleId?: string): Promise<Season[]> {
    const where = titleId ? { titleId } : {};
    return this.prisma.season.findMany({
      where,
      orderBy: { number: "asc" },
    });
  }

  async findOne(id: string): Promise<Season | null> {
    return this.prisma.season.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateSeasonDto): Promise<Season> {
    return this.prisma.season.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Season> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: { episodes: true },
    });

    if (!season) throw new Error(`Season with id ${id} not found`);

    for (const episode of season.episodes) await this.s3Service.deleteRaw(episode.id);

    await this.s3Service.deleteProcessedFolder(`videos/${season.titleId}/${id}/`);

    return this.prisma.season.delete({ where: { id } });
  }
}
