import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import { S3Service } from "../s3/s3.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { SeasonService } from "./season.service";

describe("SeasonService", () => {
  let service: SeasonService;
  let prismaMock: jest.Mocked<PrismaService>;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let mediaAssetServiceMock: jest.Mocked<MediaAssetService>;
  let posterServiceMock: {
    toPublicUrl: jest.Mock;
    removeStoredImage: jest.Mock;
    deleteStoredImage: jest.Mock;
  };

  beforeEach(async () => {
    posterServiceMock = {
      toPublicUrl: jest.fn((key: string | null) => (key ? `https://cdn.example.com/${key}` : null)),
      removeStoredImage: jest.fn(),
      deleteStoredImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonService,
        {
          provide: PrismaService,
          useValue: {
            season: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            getReadPresignedUrl: jest.fn(),
            getUploadPresignedUrl: jest.fn(),
            deleteObject: jest.fn(),
            objectExists: jest.fn(),
            getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
            deleteFolder: jest.fn(),
          },
        },
        {
          provide: MediaAssetService,
          useValue: {
            cleanupVideoAsset: jest.fn(),
            deleteProcessedFolder: jest.fn(),
          },
        },
        { provide: PosterService, useValue: posterServiceMock },
      ],
    }).compile();

    service = module.get<SeasonService>(SeasonService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
    mediaAssetServiceMock = module.get(MediaAssetService) as jest.Mocked<MediaAssetService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("should create and return the season", () => {
      it("if valid data is provided", async () => {
        const createData = {
          titleId: "title-1",
          number: 1,
          name: "Season 1",
          description: "Desc",
        };
        const createdSeason = { id: "season-1", ...createData };
        (prismaMock.season.create as jest.Mock).mockResolvedValue(createdSeason);

        const result = await service.create(createData as any);

        expect(prismaMock.season.create).toHaveBeenCalledWith({ data: createData });
        expect(result).toEqual({ ...createdSeason, posterUrl: null });
      });
    });
  });

  describe("findAll", () => {
    describe("should return the matching seasons", () => {
      it("if a titleId filter is provided", async () => {
        const seasons = [{ id: "season-1" }, { id: "season-2" }];
        (prismaMock.season.findMany as jest.Mock).mockResolvedValue(seasons);

        const result = await service.findAll([
          { property: "titleId", rule: FilterRule.EQ, value: "title-1" },
        ]);

        expect(prismaMock.season.findMany).toHaveBeenCalledWith({
          where: { titleId: "title-1" },
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(seasons.map((season) => ({ ...season, posterUrl: null })));
      });

      it("if no filters are provided", async () => {
        const seasons = [{ id: "season-1" }, { id: "season-2" }];
        (prismaMock.season.findMany as jest.Mock).mockResolvedValue(seasons);

        const result = await service.findAll();

        expect(prismaMock.season.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { number: "asc" },
        });
        expect(result).toEqual(seasons.map((season) => ({ ...season, posterUrl: null })));
      });
    });
  });

  describe("findOne", () => {
    describe("should return the season", () => {
      it("if the season exists", async () => {
        const season = { id: "season-1" };
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);

        const result = await service.findOne("season-1");

        expect(prismaMock.season.findUnique).toHaveBeenCalledWith({
          where: { id: "season-1" },
        });
        expect(result).toEqual({ ...season, posterUrl: null });
      });
    });

    describe("should return null", () => {
      it("if the season does not exist", async () => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.findOne("non-existent");

        expect(prismaMock.season.findUnique).toHaveBeenCalledWith({
          where: { id: "non-existent" },
        });
        expect(result).toBeNull();
      });
    });
  });

  describe("update", () => {
    describe("should leave the key to the transcoding pipeline", () => {
      it("ignores the flag when the client says it uploaded", async () => {
        const season = { id: "season-1" };
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        (prismaMock.season.update as jest.Mock).mockResolvedValue({ ...season, name: "New Title" });

        await service.update("season-1", {
          number: 1,
          name: "New Title",
          description: "Desc",
          titleId: "title-1",
          posterUploaded: true,
        });

        expect(prismaMock.season.update).toHaveBeenCalledWith({
          where: { id: "season-1" },
          data: expect.not.objectContaining({ posterKey: expect.anything() }),
        });
        expect(posterServiceMock.removeStoredImage).not.toHaveBeenCalled();
      });

      it("clears the column and the object when the flag says the poster is gone", async () => {
        const season = { id: "season-1" };
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        (prismaMock.season.update as jest.Mock).mockResolvedValue(season);

        await service.update("season-1", {
          number: 1,
          name: "New Title",
          description: "Desc",
          titleId: "title-1",
          posterUploaded: false,
        });

        expect(posterServiceMock.removeStoredImage).toHaveBeenCalledWith("seasons", "season-1");
        expect(prismaMock.season.update).toHaveBeenCalledWith({
          where: { id: "season-1" },
          data: expect.objectContaining({ posterKey: null }),
        });
      });
    });

    describe("should update the season without checking the poster url", () => {
      it("if the season exists and posterUrl is not provided", async () => {
        const season = { id: "season-1" };
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        (prismaMock.season.update as jest.Mock).mockResolvedValue({
          ...season,
          name: "New Title",
        });
        const updateData = {
          number: 1,
          name: "New Title",
          description: "Desc",
          titleId: "title-1",
        };

        const result = await service.update("season-1", updateData);

        expect(s3ServiceMock.getReadPresignedUrl).not.toHaveBeenCalled();
        expect(prismaMock.season.update).toHaveBeenCalledWith({
          where: { id: "season-1" },
          data: updateData,
        });
        expect(result).toEqual({ ...season, name: "New Title", posterUrl: null });
      });
    });
  });

  describe("delete", () => {
    describe("should throw NotFoundException", () => {
      it("if the season does not exist", async () => {
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.delete("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });

    describe("should delete the season, its episodes from S3, and its poster/folder from S3", () => {
      it("if the season exists", async () => {
        const season = {
          id: "season-1",
          titleId: "title-1",
          posterKey: "posters/seasons/season-1/v1.webp",
          episodes: [{ id: "episode-1" }, { id: "episode-2" }],
        };
        (prismaMock.season.findUnique as jest.Mock).mockResolvedValue(season);
        s3ServiceMock.deleteObject.mockResolvedValue(undefined as any);
        (mediaAssetServiceMock.deleteProcessedFolder as jest.Mock).mockResolvedValue(undefined);
        (mediaAssetServiceMock.cleanupVideoAsset as jest.Mock).mockResolvedValue(undefined);
        (prismaMock.season.delete as jest.Mock).mockResolvedValue(season);

        const result = await service.delete("season-1");

        expect(prismaMock.season.findUnique).toHaveBeenCalledWith({
          where: { id: "season-1" },
          include: { episodes: true },
        });

        expect(mediaAssetServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "episode-1",
          VideoType.EPISODE,
        );
        expect(mediaAssetServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "episode-2",
          VideoType.EPISODE,
        );

        expect(posterServiceMock.deleteStoredImage).toHaveBeenCalledWith(
          "posters/seasons/season-1/v1.webp",
        );
        expect(mediaAssetServiceMock.deleteProcessedFolder).toHaveBeenCalledWith(
          "videos/title-1/season-1/",
        );

        expect(prismaMock.season.delete).toHaveBeenCalledWith({
          where: { id: "season-1" },
        });
        expect(result).toEqual({
          id: season.id,
          titleId: season.titleId,
          posterUrl: "https://cdn.example.com/posters/seasons/season-1/v1.webp",
        });
      });
    });
  });
});
