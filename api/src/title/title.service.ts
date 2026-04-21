import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, Title, TitleType } from "@prisma/client";
import { S3Service } from "../S3/S3.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";

@Injectable()
export class TitleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly videoTranscoderService: VideoTranscoderService,
  ) {}

  async create(data: CreateTitleDto): Promise<Title> {
    return await this.prisma.title.create({ data });
  }

  async findAll({
    search,
    type,
    page = 1,
    limit = 10,
    sort,
    sortBy,
  }: GetAllTitleDto): Promise<{ items: Title[]; totalCount: number }> {
    const safeLimit = Math.min(limit, 100);
    const where: Prisma.TitleWhereInput = {};
    const orderBy: Prisma.TitleOrderByWithRelationInput = {};

    if (sortBy && Object.keys(Prisma.TitleScalarFieldEnum).includes(sortBy)) {
      orderBy[sortBy] = sort || "desc";
    } else {
      orderBy["createdAt"] = "desc";
    }

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (type) where.type = type;

    const [items, totalCount] = await Promise.all([
      this.prisma.title.findMany({
        where,
        skip: (page - 1) * safeLimit,
        take: safeLimit,
        orderBy,
      }),
      this.prisma.title.count({ where }),
    ]);

    return { items, totalCount };
  }

  async findOne(id: string): Promise<Title | null> {
    return await this.prisma.title.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateTitleDto): Promise<Title> {
    return await this.prisma.title.update({ where: { id }, data });
  }

  async createMovieUploadingUrl(id: string): Promise<{ url: string }> {
    const movie = await this.findOne(id);
    if (!movie) throw new BadRequestException(`Movie with id ${id} not found`);
    const url = await this.s3Service.getRawUploadUrl(id, 120);
    return { url };
  }

  async transcode(id: string): Promise<void> {
    const title = await this.findOne(id);

    if (!title) throw new BadRequestException(`Movie with id ${id} not found`);

    await this.videoTranscoderService.scheduleTranscodeVideo({
      id,
      type: VideoType.MOVIE,
    });
  }

  async getMovieUrl(id: string): Promise<{ url: string }> {
    const url = await this.s3Service.getProcessedReadUrl(`videos/${id}/master.m3u8`);

    return { url };
  }

  async remove(id: string) {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: {
        seasons: {
          include: {
            episodes: true,
          },
        },
      },
    });

    if (!title) throw new BadRequestException(`Title with id ${id} not found`);

    await this.videoTranscoderService.cancelScheduledTranscodes(id, VideoType.MOVIE);

    if (title.type === TitleType.MOVIE) {
      await this.s3Service.deleteRaw(id);
    } else if (title.type === TitleType.SERIES) {
      for (const season of title.seasons) {
        for (const episode of season.episodes) await this.s3Service.deleteRaw(episode.id);
      }
    }

    await this.s3Service.deleteProcessedFolder(`videos/${id}/`);

    return this.prisma.title.delete({ where: { id } });
  }
}
