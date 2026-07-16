import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, Title, TitleType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { assertManagedPosterUrl } from "../s3/poster-assertion.util";
import { S3Service } from "../s3/s3.service";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { DEFAULT_TITLE_POSTER_URL } from "./title.constants";

@Injectable()
export class TitleService {
  private getPosterKey(id: string) {
    return `posters/titles/${id}`;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly videoTranscoderService: VideoTranscoderService,
    private readonly seasonService: SeasonService,
  ) {}

  async create(data: CreateTitleDto): Promise<Title> {
    return await this.prisma.title.create({
      data: {
        ...data,
        posterUrl: DEFAULT_TITLE_POSTER_URL,
      },
    });
  }

  async findAll({
    search,
    type,
    transcodingStatus,
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

    if (type) {
      where.type = type;
    }

    if (transcodingStatus) {
      where.transcodingStatus = transcodingStatus;
    }
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
    return this.prisma.title.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateTitleDto): Promise<Title> {
    const title = await this.findOne(id);
    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }
    if (data.posterUrl !== undefined) {
      await assertManagedPosterUrl(
        this.s3Service,
        this.getPosterKey(id),
        data.posterUrl,
        DEFAULT_TITLE_POSTER_URL,
      );
    }

    return this.prisma.title.update({ where: { id }, data });
  }

  async createMovieUploadingUrl(id: string): Promise<{ url: string }> {
    const movie = await this.findOne(id);
    if (!movie) {
      throw new BadRequestException(`Movie with id ${id} not found`);
    }
    const url = await this.s3Service.getUploadPresignedUrl(id, BucketType.RAW, 120);
    return { url };
  }

  async createPosterUploadingUrl(id: string): Promise<{ uploadUrl: string; posterUrl: string }> {
    const title = await this.findOne(id);
    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }

    const key = this.getPosterKey(id);
    const uploadUrl = await this.s3Service.getUploadPresignedUrl(key, BucketType.PROCESSED, 120);
    const posterUrl = await this.s3Service.getReadPresignedUrl(key, BucketType.PROCESSED);

    return { uploadUrl, posterUrl };
  }

  async transcode(id: string): Promise<void> {
    const title = await this.findOne(id);

    if (!title) {
      throw new BadRequestException(`Movie with id ${id} not found`);
    }

    await this.videoTranscoderService.scheduleTranscodeVideo({
      id,
      type: VideoType.MOVIE,
    });
  }

  async getMovieUrl(id: string): Promise<{ url: string }> {
    const url = await this.s3Service.getReadPresignedUrl(
      `videos/${id}/master.m3u8`,
      BucketType.PROCESSED,
    );
    return { url };
  }

  async delete(id: string) {
    const title = await this.prisma.title.findUnique({
      where: { id },
      include: {
        seasons: true,
      },
    });

    if (!title) {
      throw new BadRequestException(`Title with id ${id} not found`);
    }

    await this.videoTranscoderService.cancelScheduledTranscodes(id, VideoType.MOVIE);

    if (title.type === TitleType.SERIES) {
      await Promise.all(title.seasons.map((season) => this.seasonService.delete(season.id)));
    }

    await this.s3Service.deleteObject(this.getPosterKey(id), BucketType.PROCESSED);
    await this.s3Service.deleteFolder(`videos/${id}/`, BucketType.PROCESSED);

    return this.prisma.title.delete({ where: { id } });
  }
}
