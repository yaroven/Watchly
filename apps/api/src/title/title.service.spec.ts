import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AgeRating, Prisma, TitleType } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PosterService } from "../poster/poster.service";
import { PrismaService } from "../prisma/prisma.service";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { SeasonService } from "../season/season.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { TitleService } from "./title.service";

describe("TitleService", () => {
  let service: TitleService;
  let prismaServiceMock: jest.Mocked<PrismaService>;
  let s3ServiceMock: jest.Mocked<S3Service>;
  let mediaAssetServiceMock: jest.Mocked<MediaAssetService>;
  let seasonServiceMock: jest.Mocked<SeasonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleService,
        {
          provide: PrismaService,
          useValue: {
            title: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            castCredit: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              createMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            getUploadPresignedUrl: jest.fn(),
            getReadPresignedUrl: jest.fn(),
            deleteObject: jest.fn(),
            deleteFolder: jest.fn(),
          },
        },
        PosterService,
        {
          provide: MediaAssetService,
          useValue: {
            startUpload: jest.fn(),
            completeUpload: jest.fn(),
            abortUpload: jest.fn(),
            scheduleTranscode: jest.fn(),
            getReadUrl: jest.fn(),
            cleanupVideoAsset: jest.fn(),
          },
        },
        {
          provide: SeasonService,
          useValue: {
            delete: jest.fn(),
            cleanupAssets: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TitleService>(TitleService);
    prismaServiceMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    s3ServiceMock = module.get(S3Service) as jest.Mocked<S3Service>;
    mediaAssetServiceMock = module.get(MediaAssetService) as jest.Mocked<MediaAssetService>;
    seasonServiceMock = module.get(SeasonService) as jest.Mocked<SeasonService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    describe("should return the created title with no poster", () => {
      it("if valid data is provided", async () => {
        const createData = {
          name: "Title",
          type: TitleType.MOVIE,
          description: "Desc",
          ageRating: AgeRating.AGE_0,
          country: "US",
          releaseDate: "2026-01-01",
          language: "en",
          trailerUrl: "https://example.com/trailer.mp4",
          runtime: 120,
          network: "Netflix",
          director: "Jane Doe",
          closedCaption: true,
        };
        const createdTitle = { id: "title-1", ...createData, posterUrl: null, genres: [] };
        (prismaServiceMock.title.create as jest.Mock).mockResolvedValue(createdTitle);

        const result = await service.create(createData);

        expect(prismaServiceMock.title.create).toHaveBeenCalledWith({
          data: { ...createData, genres: undefined },
          include: { genres: true },
        });
        expect(result).toEqual(createdTitle);
      });
    });
  });

  describe("findAll", () => {
    describe("should return paginated titles", () => {
      it("if fetching without filters", async () => {
        const titles = [{ id: "title-1", name: "Title 1", genres: [] }];
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue(titles);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(1);

        const result = await service.findAll({ page: 1, limit: 10 });

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith({
          where: {},
          skip: 0,
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { genres: true },
        });
        expect(result).toEqual({ items: titles, totalCount: 1 });
      });
    });

    describe("should filter by substring match", () => {
      it("if filtering by name (LIKE)", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "name", rule: FilterRule.LIKE, value: "Test" },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { name: { contains: "Test", mode: "insensitive" } },
          }),
        );
      });
    });

    describe("should sort ascending by name", () => {
      it("if sorting by that field", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, { property: "name", direction: "asc" });

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { name: "asc" },
          }),
        );
      });
    });

    describe("should filter by type", () => {
      beforeEach(() => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);
      });

      it("if type is MOVIE", async () => {
        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "type", rule: FilterRule.EQ, value: TitleType.MOVIE },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ type: TitleType.MOVIE }),
          }),
        );
      });

      it("if type is SERIES", async () => {
        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "type", rule: FilterRule.EQ, value: TitleType.SERIES },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ type: TitleType.SERIES }),
          }),
        );
      });
    });

    describe("should filter by transcodingStatus", () => {
      it("if filtering by transcodingStatus", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "transcodingStatus", rule: FilterRule.EQ, value: "COMPLETED" },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ transcodingStatus: "COMPLETED" }),
          }),
        );
      });
    });
  });

  describe("findOne", () => {
    describe("should return the title", () => {
      it("if the title exists", async () => {
        const title = { id: "title-1", genres: [] };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);

        const result = await service.findOne("title-1");

        expect(prismaServiceMock.title.findUnique).toHaveBeenCalledWith({
          where: { id: "title-1" },
          include: { genres: true },
        });
        expect(result).toEqual(title);
      });
    });

    describe("should return null", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.findOne("non-existent");

        expect(result).toBeNull();
      });
    });
  });

  describe("update", () => {
    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.update("non-existent", { name: "New Name" } as any);

        await expect(action).rejects.toThrow(BadRequestException);
      });

      it("if the poster url is an external, non-managed url", async () => {
        const title = { id: "title-1", genres: [] };
        const updateData = { posterUrl: "https://external.com/poster.jpg" };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(
          "https://s3.amazonaws.com/poster",
        );

        const action = service.update("title-1", updateData as any);

        await expect(action).rejects.toThrow(BadRequestException);
        await expect(action).rejects.toThrow("Poster URL must be generated by the backend");
      });
    });

    describe("should update the title without a presigned url check", () => {
      it("if updating without a poster url", async () => {
        const title = { id: "title-1", name: "Old Name", genres: [] };
        const updateData = { name: "New Name" };
        const updatedTitle = { ...title, ...updateData };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.update as jest.Mock).mockResolvedValue(updatedTitle);

        const result = await service.update("title-1", updateData as any);

        expect(s3ServiceMock.getReadPresignedUrl).not.toHaveBeenCalled();
        expect(prismaServiceMock.title.update).toHaveBeenCalledWith({
          where: { id: "title-1" },
          data: { ...updateData, genres: undefined },
          include: { genres: true },
        });
        expect(result).toEqual(updatedTitle);
      });
    });

    describe("should update the title successfully", () => {
      it("if the poster url is a managed, backend-generated url", async () => {
        const title = { id: "title-1", genres: [] };
        const updateData = { posterUrl: "https://s3.amazonaws.com/poster" };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(
          "https://s3.amazonaws.com/poster",
        );
        (prismaServiceMock.title.update as jest.Mock).mockResolvedValue({
          ...title,
          ...updateData,
        });

        await service.update("title-1", updateData as any);

        expect(prismaServiceMock.title.update).toHaveBeenCalled();
      });
    });
  });

  describe("startMovieUpload", () => {
    describe("should start a multipart upload", () => {
      it("if the title exists", async () => {
        const startResponse = {
          uploadId: "upload-1",
          partSize: 8,
          parts: [{ partNumber: 1, url: "u" }],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });
        (mediaAssetServiceMock.startUpload as jest.Mock).mockResolvedValue(startResponse);

        const result = await service.startMovieUpload("title-1", 1000);

        expect(mediaAssetServiceMock.startUpload).toHaveBeenCalledWith("title-1", 1000);
        expect(result).toEqual(startResponse);
      });
    });

    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.startMovieUpload("non-existent", 1000);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("completeMovieUpload", () => {
    describe("should complete the multipart upload", () => {
      it("if the title exists", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });
        const parts = [{ partNumber: 1, eTag: "etag-1" }];

        await service.completeMovieUpload("title-1", "upload-1", parts);

        expect(mediaAssetServiceMock.completeUpload).toHaveBeenCalledWith(
          "title-1",
          "upload-1",
          parts,
        );
      });
    });

    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.completeMovieUpload("non-existent", "upload-1", []);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("abortMovieUpload", () => {
    describe("should abort the multipart upload", () => {
      it("regardless of title state", async () => {
        await service.abortMovieUpload("title-1", "upload-1");

        expect(mediaAssetServiceMock.abortUpload).toHaveBeenCalledWith("title-1", "upload-1");
      });
    });
  });

  describe("createPosterUploadingUrl", () => {
    describe("should return upload and poster urls", () => {
      it("if the title exists", async () => {
        const uploadUrl = "upload-url";
        const posterUrl = "poster-url";
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });
        (s3ServiceMock.getUploadPresignedUrl as jest.Mock).mockResolvedValue(uploadUrl);
        (s3ServiceMock.getReadPresignedUrl as jest.Mock).mockResolvedValue(posterUrl);

        const result = await service.createPosterUploadingUrl("title-1");

        expect(s3ServiceMock.getUploadPresignedUrl).toHaveBeenCalledWith(
          "posters/titles/title-1",
          expect.any(String),
          120,
        );
        expect(s3ServiceMock.getReadPresignedUrl).toHaveBeenCalledWith(
          "posters/titles/title-1",
          expect.any(String),
        );
        expect(result).toEqual({ uploadUrl, posterUrl });
      });
    });
  });

  describe("transcode", () => {
    describe("should schedule transcoding", () => {
      it("if the title exists", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });

        await service.transcode("title-1");

        expect(mediaAssetServiceMock.scheduleTranscode).toHaveBeenCalledWith(
          "title-1",
          VideoType.MOVIE,
        );
      });
    });

    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.transcode("non-existent");

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("getMovieUrl", () => {
    describe("should return the movie's presigned url", () => {
      it("always", async () => {
        const url = "movie-url";
        (mediaAssetServiceMock.getReadUrl as jest.Mock).mockResolvedValue({ url });

        const result = await service.getMovieUrl("title-1");

        expect(mediaAssetServiceMock.getReadUrl).toHaveBeenCalledWith("videos/title-1/master.m3u8");
        expect(result).toEqual({ url });
      });
    });
  });

  describe("delete", () => {
    describe("should delete the title and cleanup its resources", () => {
      it("if the title exists as a MOVIE", async () => {
        const title = { id: "title-1", type: TitleType.MOVIE, seasons: [], genres: [] };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        const result = await service.delete("title-1");

        expect(mediaAssetServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "title-1",
          VideoType.MOVIE,
          "videos/title-1/",
        );
        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith(
          "posters/titles/title-1",
          BucketType.PROCESSED,
        );
        expect(prismaServiceMock.title.delete).toHaveBeenCalledWith({
          where: { id: "title-1" },
          include: { genres: true },
        });
        expect(result).toEqual({ id: title.id, type: title.type, genres: [] });
      });
    });

    describe("should clean up assets for each season after the title row is deleted", () => {
      it("if the title exists as a SERIES", async () => {
        const title = {
          id: "title-1",
          type: TitleType.SERIES,
          seasons: [{ id: "season-1" }, { id: "season-2" }],
          genres: [],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        await service.delete("title-1");

        expect(prismaServiceMock.title.delete).toHaveBeenCalledWith({
          where: { id: "title-1" },
          include: { genres: true },
        });
        expect(seasonServiceMock.cleanupAssets).toHaveBeenCalledWith(title.seasons[0]);
        expect(seasonServiceMock.cleanupAssets).toHaveBeenCalledWith(title.seasons[1]);
      });
    });

    describe("should clean up the movie's own video asset", () => {
      it("if the title exists as a SERIES", async () => {
        const title = {
          id: "title-1",
          type: TitleType.SERIES,
          seasons: [{ id: "season-1" }, { id: "season-2" }],
          genres: [],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        await service.delete("title-1");

        expect(mediaAssetServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "title-1",
          VideoType.MOVIE,
          "videos/title-1/",
        );
      });
    });

    describe("should cleanup the poster", () => {
      it("if the title exists as a SERIES", async () => {
        const title = {
          id: "title-1",
          type: TitleType.SERIES,
          seasons: [{ id: "season-1" }, { id: "season-2" }],
          genres: [],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        await service.delete("title-1");

        expect(s3ServiceMock.deleteObject).toHaveBeenCalledWith(
          "posters/titles/title-1",
          BucketType.PROCESSED,
        );
      });
    });

    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.delete("non-existent");

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("getCast", () => {
    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.getCast("non-existent");

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should return the cast ordered for display", () => {
      it("if the title exists", async () => {
        const credits = [
          {
            id: "credit-1",
            character: "Neo",
            order: 0,
            artist: { id: "artist-1", name: "Keanu Reeves" },
          },
        ];
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });
        (prismaServiceMock.castCredit.findMany as jest.Mock).mockResolvedValue(credits);

        const result = await service.getCast("title-1");

        expect(prismaServiceMock.castCredit.findMany).toHaveBeenCalledWith({
          where: { titleId: "title-1" },
          include: { artist: true },
          orderBy: { order: "asc" },
        });
        expect(result).toEqual([
          { id: "credit-1", character: "Neo", order: 0, artist: credits[0].artist },
        ]);
      });
    });
  });

  describe("setCast", () => {
    describe("should throw BadRequestException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.setCast("non-existent", [{ artistId: "artist-1" }]);

        await expect(action).rejects.toThrow(BadRequestException);
      });

      it("if one or more artistId values do not exist, instead of the raw Prisma error", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });
        (prismaServiceMock.$transaction as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
            code: "P2003",
            clientVersion: "test",
          }),
        );

        const action = service.setCast("title-1", [{ artistId: "non-existent" }]);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should replace the cast and return the fresh list", () => {
      it("if the credits are valid", async () => {
        const credits = [
          {
            id: "credit-1",
            character: "Neo",
            order: 0,
            artist: { id: "artist-1", name: "Keanu Reeves" },
          },
        ];
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
          id: "title-1",
          genres: [],
        });
        (prismaServiceMock.$transaction as jest.Mock).mockResolvedValue([
          { count: 0 },
          { count: 1 },
        ]);
        (prismaServiceMock.castCredit.findMany as jest.Mock).mockResolvedValue(credits);

        const result = await service.setCast("title-1", [
          { artistId: "artist-1", character: "Neo" },
        ]);

        expect(prismaServiceMock.castCredit.deleteMany).toHaveBeenCalledWith({
          where: { titleId: "title-1" },
        });
        expect(prismaServiceMock.castCredit.createMany).toHaveBeenCalledWith({
          data: [{ titleId: "title-1", artistId: "artist-1", character: "Neo", order: 0 }],
        });
        expect(result).toEqual([
          { id: "credit-1", character: "Neo", order: 0, artist: credits[0].artist },
        ]);
      });
    });
  });
});
