import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TitleType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { S3Service } from "../s3/s3.service";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { CreateTitleDto } from "./dto/request/create-title.dto";
import { GetAllTitleDto } from "./dto/request/get-all-title.dto";
import { UpdateTitleDto } from "./dto/request/update-title.dto";
import { TitleService } from "./title.service";

describe("TitleService", () => {
  let service: TitleService;
  let prismaService: PrismaService;
  let s3Service: S3Service;
  let videoTranscoderService: VideoTranscoderService;
  let seasonService: SeasonService;

  const mockPrismaService = {
    title: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockS3Service = {
    getUploadPresignedUrl: jest.fn(),
    getReadPresignedUrl: jest.fn(),
    deleteObject: jest.fn(),
    deleteFolder: jest.fn(),
  };

  const mockVideoTranscoderService = {
    scheduleTranscodeVideo: jest.fn(),
    cancelScheduledTranscodes: jest.fn(),
  };

  const mockSeasonService = {
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: VideoTranscoderService,
          useValue: mockVideoTranscoderService,
        },
        {
          provide: SeasonService,
          useValue: mockSeasonService,
        },
      ],
    }).compile();

    service = module.get<TitleService>(TitleService);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
    videoTranscoderService = module.get<VideoTranscoderService>(VideoTranscoderService);
    seasonService = module.get<SeasonService>(SeasonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a title with default poster", async () => {
      const createTitleDto: CreateTitleDto = {
        name: "Test Title",
        type: TitleType.MOVIE,
        description: "Test overview",
      };

      const mockTitle = {
        id: "title-1",
        ...createTitleDto,
        posterUrl: "/cat.webp",
      };

      mockPrismaService.title.create.mockResolvedValue(mockTitle);

      const result = await service.create(createTitleDto);

      expect(result).toEqual(mockTitle);
      expect(mockPrismaService.title.create).toHaveBeenCalledWith({
        data: {
          ...createTitleDto,
          posterUrl: "/cat.webp",
        },
      });
    });
  });

  describe("findAll", () => {
    it("should return paginated titles without filters", async () => {
      const getAllTitleDto: GetAllTitleDto = {
        page: 1,
        limit: 10,
      };

      const mockTitles = [
        { id: "title-1", name: "Title 1" },
        { id: "title-2", name: "Title 2" },
      ];

      mockPrismaService.title.findMany.mockResolvedValue(mockTitles);
      mockPrismaService.title.count.mockResolvedValue(2);

      const result = await service.findAll(getAllTitleDto);

      expect(result).toEqual({ items: mockTitles, totalCount: 2 });
      expect(mockPrismaService.title.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter titles by search term", async () => {
      const getAllTitleDto: GetAllTitleDto = {
        search: "Test",
        page: 1,
        limit: 10,
      };

      const mockTitles = [{ id: "title-1", name: "Test Title" }];

      mockPrismaService.title.findMany.mockResolvedValue(mockTitles);
      mockPrismaService.title.count.mockResolvedValue(1);

      const result = await service.findAll(getAllTitleDto);

      expect(mockPrismaService.title.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: "Test",
            mode: "insensitive",
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter titles by type", async () => {
      const getAllTitleDto: GetAllTitleDto = {
        type: TitleType.MOVIE,
        page: 1,
        limit: 10,
      };

      const mockTitles = [{ id: "title-1", name: "Movie", type: TitleType.MOVIE }];

      mockPrismaService.title.findMany.mockResolvedValue(mockTitles);
      mockPrismaService.title.count.mockResolvedValue(1);

      const result = await service.findAll(getAllTitleDto);

      expect(mockPrismaService.title.findMany).toHaveBeenCalledWith({
        where: { type: TitleType.MOVIE },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter titles by transcoding status", async () => {
      const getAllTitleDto: GetAllTitleDto = {
        transcodingStatus: "COMPLETED",
        page: 1,
        limit: 10,
      };

      const mockTitles = [{ id: "title-1", name: "Movie", transcodingStatus: "COMPLETED" }];

      mockPrismaService.title.findMany.mockResolvedValue(mockTitles);
      mockPrismaService.title.count.mockResolvedValue(1);

      const result = await service.findAll(getAllTitleDto);

      expect(mockPrismaService.title.findMany).toHaveBeenCalledWith({
        where: { transcodingStatus: "COMPLETED" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should limit results to maximum 100", async () => {
      const getAllTitleDto: GetAllTitleDto = {
        limit: 200,
        page: 1,
      };

      const mockTitles = [{ id: "title-1", name: "Movie" }];

      mockPrismaService.title.findMany.mockResolvedValue(mockTitles);
      mockPrismaService.title.count.mockResolvedValue(1);

      const result = await service.findAll(getAllTitleDto);

      expect(mockPrismaService.title.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 100,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should sort by specified field", async () => {
      const getAllTitleDto: GetAllTitleDto = {
        sortBy: "name",
        sort: "asc",
        page: 1,
        limit: 10,
      };

      const mockTitles = [{ id: "title-1", name: "Movie" }];

      mockPrismaService.title.findMany.mockResolvedValue(mockTitles);
      mockPrismaService.title.count.mockResolvedValue(1);

      const result = await service.findAll(getAllTitleDto);

      expect(mockPrismaService.title.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { name: "asc" },
      });
    });
  });

  describe("findOne", () => {
    it("should return a title by id", async () => {
      const mockTitle = { id: "title-1", name: "Test Title" };
      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);

      const result = await service.findOne("title-1");

      expect(result).toEqual(mockTitle);
      expect(mockPrismaService.title.findUnique).toHaveBeenCalledWith({
        where: { id: "title-1" },
      });
    });

    it("should return null if title not found", async () => {
      mockPrismaService.title.findUnique.mockResolvedValue(null);

      const result = await service.findOne("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update a title successfully", async () => {
      const updateTitleDto: UpdateTitleDto = {
        name: "Updated Title",
        description: "Test description",
        type: TitleType.MOVIE,
        posterUrl: "/cat.webp",
      };

      const mockTitle = { id: "title-1", name: "Old Title" };
      const mockUpdatedTitle = { ...mockTitle, ...updateTitleDto };

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockS3Service.getReadPresignedUrl.mockResolvedValue("https://example.com/poster");
      mockPrismaService.title.update.mockResolvedValue(mockUpdatedTitle);

      const result = await service.update("title-1", updateTitleDto);

      expect(result).toEqual(mockUpdatedTitle);
      expect(mockPrismaService.title.update).toHaveBeenCalledWith({
        where: { id: "title-1" },
        data: updateTitleDto,
      });
    });

    it("should throw BadRequestException if title not found", async () => {
      mockPrismaService.title.findUnique.mockResolvedValue(null);

      await expect(service.update("non-existent", { name: "Test" } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject non-managed poster URL", async () => {
      const updateTitleDto: UpdateTitleDto = {
        posterUrl: "https://external.com/poster.jpg",
        name: "Test",
        description: "Test",
        type: TitleType.MOVIE,
      };

      const mockTitle = { id: "title-1", name: "Test Title" };

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockS3Service.getReadPresignedUrl.mockResolvedValue("https://s3.amazonaws.com/poster");

      await expect(service.update("title-1", updateTitleDto)).rejects.toThrow(BadRequestException);
      await expect(service.update("title-1", updateTitleDto)).rejects.toThrow(
        "Poster URL must be generated by the backend",
      );
    });

    it("should allow default poster URL", async () => {
      const updateTitleDto: UpdateTitleDto = {
        posterUrl: "/cat.webp",
        name: "Test",
        description: "Test",
        type: TitleType.MOVIE,
      };

      const mockTitle = { id: "title-1", name: "Test Title" };

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockPrismaService.title.update.mockResolvedValue(mockTitle);

      const result = await service.update("title-1", updateTitleDto);

      expect(result).toEqual(mockTitle);
      expect(mockS3Service.getReadPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe("createMovieUploadingUrl", () => {
    it("should return presigned upload URL for movie", async () => {
      const mockTitle = { id: "title-1", name: "Test Movie" };
      const mockUrl = "https://example.com/upload-url";

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockS3Service.getUploadPresignedUrl.mockResolvedValue(mockUrl);

      const result = await service.createMovieUploadingUrl("title-1");

      expect(result).toEqual({ url: mockUrl });
      expect(mockS3Service.getUploadPresignedUrl).toHaveBeenCalledWith(
        "title-1",
        expect.any(String),
        120,
      );
    });

    it("should throw BadRequestException if movie not found", async () => {
      mockPrismaService.title.findUnique.mockResolvedValue(null);

      await expect(service.createMovieUploadingUrl("non-existent")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("createPosterUploadingUrl", () => {
    it("should return upload URL and poster URL", async () => {
      const mockTitle = { id: "title-1", name: "Test Title" };
      const mockUploadUrl = "https://example.com/upload-url";
      const mockPosterUrl = "https://example.com/poster-url";

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockS3Service.getUploadPresignedUrl.mockResolvedValue(mockUploadUrl);
      mockS3Service.getReadPresignedUrl.mockResolvedValue(mockPosterUrl);

      const result = await service.createPosterUploadingUrl("title-1");

      expect(result).toEqual({ uploadUrl: mockUploadUrl, posterUrl: mockPosterUrl });
      expect(mockS3Service.getUploadPresignedUrl).toHaveBeenCalledWith(
        `posters/titles/title-1`,
        expect.any(String),
        120,
      );
      expect(mockS3Service.getReadPresignedUrl).toHaveBeenCalledWith(
        `posters/titles/title-1`,
        expect.any(String),
      );
    });

    it("should throw BadRequestException if title not found", async () => {
      mockPrismaService.title.findUnique.mockResolvedValue(null);

      await expect(service.createPosterUploadingUrl("non-existent")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("transcode", () => {
    it("should schedule movie transcoding", async () => {
      const mockTitle = { id: "title-1", name: "Test Movie" };
      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);

      await service.transcode("title-1");

      expect(mockVideoTranscoderService.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: "title-1",
        type: VideoType.MOVIE,
      });
    });

    it("should throw BadRequestException if movie not found", async () => {
      mockPrismaService.title.findUnique.mockResolvedValue(null);

      await expect(service.transcode("non-existent")).rejects.toThrow(BadRequestException);
    });
  });

  describe("getMovieUrl", () => {
    it("should return presigned movie URL", async () => {
      const mockUrl = "https://example.com/movie-url";

      mockS3Service.getReadPresignedUrl.mockResolvedValue(mockUrl);

      const result = await service.getMovieUrl("title-1");

      expect(result).toEqual({ url: mockUrl });
      expect(mockS3Service.getReadPresignedUrl).toHaveBeenCalledWith(
        `videos/title-1/master.m3u8`,
        expect.any(String),
      );
    });
  });

  describe("delete", () => {
    it("should delete a movie successfully", async () => {
      const mockTitle = {
        id: "title-1",
        name: "Test Movie",
        type: TitleType.MOVIE,
        seasons: [],
      };

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockPrismaService.title.delete.mockResolvedValue(mockTitle);

      const result = await service.delete("title-1");

      expect(result).toEqual(mockTitle);
      expect(mockVideoTranscoderService.cancelScheduledTranscodes).toHaveBeenCalledWith(
        "title-1",
        VideoType.MOVIE,
      );
      expect(mockS3Service.deleteObject).toHaveBeenCalled();
      expect(mockS3Service.deleteFolder).toHaveBeenCalledWith(
        `videos/title-1/`,
        expect.any(String),
      );
      expect(mockPrismaService.title.delete).toHaveBeenCalledWith({
        where: { id: "title-1" },
      });
    });

    it("should delete a series and cascade delete seasons", async () => {
      const mockTitle = {
        id: "title-1",
        name: "Test Series",
        type: TitleType.SERIES,
        seasons: [{ id: "season-1" }, { id: "season-2" }],
      };

      mockPrismaService.title.findUnique.mockResolvedValue(mockTitle);
      mockPrismaService.title.delete.mockResolvedValue(mockTitle);

      const result = await service.delete("title-1");

      expect(result).toEqual(mockTitle);
      expect(mockSeasonService.delete).toHaveBeenCalledWith("season-1");
      expect(mockSeasonService.delete).toHaveBeenCalledWith("season-2");
    });

    it("should throw BadRequestException if title not found", async () => {
      mockPrismaService.title.findUnique.mockResolvedValue(null);

      await expect(service.delete("non-existent")).rejects.toThrow(BadRequestException);
    });
  });
});
