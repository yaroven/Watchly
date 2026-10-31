import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AgeRating, Prisma, ReactionType, TitleType } from "@prisma/client";
import { FilterRule } from "../../common/pagination/filter-rule.enum";
import { ImageService } from "../image/image.service";
import { MediaAssetService } from "../media-asset/media-asset.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { S3Service } from "../s3/s3.service";
import { SeasonService } from "../season/season.service";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { TitleService } from "./title.service";

describe("TitleService", () => {
  let service: TitleService;
  let prismaServiceMock: jest.Mocked<PrismaService>;
  let txMock: {
    title: { delete: jest.Mock };
    engagementCounters: { deleteMany: jest.Mock };
    reaction: { deleteMany: jest.Mock };
  };
  let s3ServiceMock: jest.Mocked<S3Service>;
  let mediaAssetServiceMock: jest.Mocked<MediaAssetService>;
  let seasonServiceMock: jest.Mocked<SeasonService>;

  let imageServiceMock: {
    toPublicUrl: jest.Mock;
    remove: jest.Mock;
    deleteStoredImage: jest.Mock;
  };
  let voteStateMock: { forTitles: jest.Mock };

  beforeEach(async () => {
    txMock = {
      title: { delete: jest.fn() },
      engagementCounters: { deleteMany: jest.fn() },
      reaction: { deleteMany: jest.fn() },
    };

    imageServiceMock = {
      toPublicUrl: jest.fn((key: string | null) => (key ? `https://cdn.example.com/${key}` : null)),
      remove: jest.fn(),
      deleteStoredImage: jest.fn(),
    };

    voteStateMock = { forTitles: jest.fn().mockResolvedValue(new Map()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleService,
        { provide: VoteStateService, useValue: voteStateMock },
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
            titleRating: {
              aggregate: jest
                .fn()
                .mockResolvedValue({ _avg: { score: null }, _count: { _all: 0 } }),
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            reaction: {
              groupBy: jest.fn().mockResolvedValue([]),
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            watchlistItem: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            engagementCounters: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn().mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0 }),
              deleteMany: jest.fn(),
            },
            titleEngagement: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn(),
            },
            $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(txMock)),
          },
        },
        {
          provide: S3Service,
          useValue: {
            getUploadPresignedUrl: jest.fn(),
            getReadPresignedUrl: jest.fn(),
            deleteObject: jest.fn(),
            objectExists: jest.fn(),
            getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
            deleteFolder: jest.fn(),
          },
        },
        { provide: ImageService, useValue: imageServiceMock },
        {
          provide: MediaAssetService,
          useValue: {
            startUpload: jest.fn(),
            completeUpload: jest.fn(),
            abortUpload: jest.fn(),
            scheduleTranscode: jest.fn(),
            getPlaybackUrl: jest.fn(),
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
    it("should state the viewer's engagement rather than reporting it unknown", async () => {
      (prismaServiceMock.title.create as jest.Mock).mockResolvedValue({
        id: "title-1",
        genres: [],
      });

      const result = await service.create({ name: "Title", genreIds: [] } as never);

      expect(result.engagement.viewer).toEqual({ score: null, reaction: null, inWatchlist: false });
    });

    describe("should return the created title with no poster", () => {
      it("if valid data is provided", async () => {
        const createData = {
          name: "Title",
          type: TitleType.MOVIE,
          description: "Desc",
          ageRating: AgeRating.AGE_0,
          country: "US",

          releaseDate: new Date("2026-01-01"),
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
          include: { genres: true, externalRatings: true },
        });
        expect(result).toMatchObject({
          id: "title-1",
          name: "Title",
          genres: [],
          externalRatings: [],
        });
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
          include: { genres: true, externalRatings: true, engagement: true, counters: true },
        });
        expect(result.totalCount).toBe(1);
        expect(result.items).toMatchObject([{ id: "title-1", name: "Title 1", genres: [] }]);
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

    describe("should filter by director", () => {
      it("if filtering by director", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "director", rule: FilterRule.EQ, value: "Jane Doe" },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ director: "Jane Doe" }),
          }),
        );
      });
    });

    describe("should filter by network", () => {
      it("if filtering by network", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "network", rule: FilterRule.EQ, value: "Netflix" },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ network: "Netflix" }),
          }),
        );
      });
    });

    describe("should filter by genre", () => {
      it("if given a single genre id", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "genres", rule: FilterRule.EQ, value: "genre-1" },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              genres: { some: { id: { in: ["genre-1"] } } },
            }),
          }),
        );
      });

      it("if given a comma-separated list of genre ids with the IN rule", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "genres", rule: FilterRule.IN, value: "genre-1,genre-2" },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              genres: { some: { id: { in: ["genre-1", "genre-2"] } } },
            }),
          }),
        );
      });

      it("if combined with a scalar filter", async () => {
        (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
        (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

        await service.findAll({ page: 1, limit: 10 }, undefined, [
          { property: "genres", rule: FilterRule.EQ, value: "genre-1" },
          { property: "type", rule: FilterRule.EQ, value: TitleType.MOVIE },
        ]);

        expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              type: TitleType.MOVIE,
              genres: { some: { id: { in: ["genre-1"] } } },
            }),
          }),
        );
      });
    });
  });

  describe("the viewer on read paths", () => {
    const titleRow = { id: "title-1", genres: [] };

    it("should build a viewer block for findOne when there is a viewer", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
        ...titleRow,
        ratings: [{ score: 8 }],
      });

      const result = await service.findOne("title-1", "viewer-1");

      expect(result?.engagement.viewer).toEqual({ score: 8, reaction: null, inWatchlist: false });
    });

    it("should scope the viewer's own rows to that viewer", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(titleRow);

      await service.findOne("title-1", "viewer-1");

      expect(prismaServiceMock.title.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            ratings: { where: { userId: "viewer-1" }, select: { score: true } },
          }),
        }),
      );
    });

    it("should build a viewer block for findAll when there is a viewer", async () => {
      (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([titleRow]);
      (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 }, undefined, [], "viewer-1");

      expect(result.items[0].engagement.viewer).not.toBeNull();
    });

    it("should forward the viewer from update, so an admin's echo is not blank", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
      (prismaServiceMock.title.update as jest.Mock).mockResolvedValue(titleRow);

      const result = await service.update("title-1", {} as never, "viewer-1");

      expect(result.engagement.viewer).not.toBeNull();
    });

    it("should prefer the cached vote over the relation", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
        ...titleRow,
        reactions: [{ type: ReactionType.LIKE }],
      });
      voteStateMock.forTitles.mockResolvedValue(new Map([["title-1", ReactionType.DISLIKE]]));

      const result = await service.findOne("title-1", "viewer-1");

      expect(result?.engagement.viewer?.reaction).toBe(ReactionType.DISLIKE);
      expect(voteStateMock.forTitles).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "title-1" })]),
        "viewer-1",
      );
    });

    it("should prefer a cached withdrawal over the relation", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
        ...titleRow,
        reactions: [{ type: ReactionType.LIKE }],
      });
      voteStateMock.forTitles.mockResolvedValue(new Map([["title-1", null]]));

      const result = await service.findOne("title-1", "viewer-1");

      expect(result?.engagement.viewer?.reaction).toBeNull();
    });

    it("should fall back to the relation for a pair the cache has no answer for", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
        ...titleRow,
        reactions: [{ type: ReactionType.LIKE }],
      });

      const result = await service.findOne("title-1", "viewer-1");

      expect(result?.engagement.viewer?.reaction).toBe(ReactionType.LIKE);
    });

    it("should hand the absent viewer on rather than inventing one", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(titleRow);

      await service.findOne("title-1");

      expect(voteStateMock.forTitles).toHaveBeenCalledWith(expect.anything(), null);
    });

    it("should answer null, not an empty viewer block, when there is no viewer", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(titleRow);

      const result = await service.findOne("title-1");

      expect(result?.engagement.viewer).toBeNull();
      const { include } = (prismaServiceMock.title.findUnique as jest.Mock).mock.calls[0][0];
      expect(include).not.toHaveProperty("ratings");
      expect(include).not.toHaveProperty("watchlistEntries");

      expect(prismaServiceMock.reaction.findMany).not.toHaveBeenCalled();
    });
  });

  describe("a page answers for every title", () => {
    it("should read a title with no cached rows as zeroes, not as a gap", async () => {
      (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([
        {
          id: "title-1",
          genres: [],
          externalRatings: [],
          engagement: { avgScore: 6, ratingCount: 2, watchlistCount: 0 },
          counters: { likes: 3, dislikes: 0, commentCount: 1 },
        },
        { id: "title-2", genres: [], externalRatings: [], engagement: null, counters: null },
      ]);
      (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(2);

      const { items } = await service.findAll({ page: 1, limit: 10 }, undefined, [], undefined);
      const byId = new Map(items.map((item) => [item.id, item.engagement]));

      expect(byId.get("title-1")?.averageScore).toBe(6);
      expect(byId.get("title-1")?.likes).toBe(3);
      expect(byId.get("title-2")?.averageScore).toBeNull();
      expect(byId.get("title-2")?.likes).toBe(0);
      expect(byId.get("title-2")?.commentCount).toBe(0);
    });

    it("should load both cached rows with the page rather than per title", async () => {
      (prismaServiceMock.title.findMany as jest.Mock).mockResolvedValue([]);
      (prismaServiceMock.title.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 }, undefined, [], undefined);

      expect(prismaServiceMock.title.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ engagement: true, counters: true }),
        }),
      );
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
          include: { genres: true, externalRatings: true, engagement: true, counters: true },
        });
        expect(result).toMatchObject({ id: "title-1", genres: [] });
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
    describe("should throw NotFoundException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.update("non-existent", { name: "New Name" } as any);

        await expect(action).rejects.toThrow(NotFoundException);
      });

      it("if the title is deleted between the check and the write", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock)
          .mockResolvedValueOnce({ id: "title-1" })
          .mockResolvedValueOnce(null);
        (prismaServiceMock.title.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("gone", {
            code: "P2025",
            clientVersion: "7.8.0",
          }),
        );

        const action = service.update("title-1", { name: "New Name" } as any);

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });

    describe("should throw BadRequestException", () => {
      it("if a genreId does not exist and the title is still there", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({ id: "title-1" });
        (prismaServiceMock.title.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("bad genre", {
            code: "P2025",
            clientVersion: "7.8.0",
          }),
        );

        const action = service.update("title-1", { genreIds: ["nope"] } as any);

        await expect(action).rejects.toThrow("One or more genreIds do not exist");
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
          include: { genres: true, externalRatings: true, engagement: true, counters: true },
        });
        expect(result).toMatchObject({ id: "title-1", name: "New Name", genres: [] });
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

  describe("the poster on update", () => {
    it("should leave the poster to its own routes", async () => {
      (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue({
        id: "title-1",
        genres: [],
      });
      (prismaServiceMock.title.update as jest.Mock).mockResolvedValue({
        id: "title-1",
        genres: [],
      });

      await service.update("title-1", { name: "Renamed" } as any);

      expect(prismaServiceMock.title.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ posterKey: expect.anything() }),
        }),
      );
      expect(imageServiceMock.remove).not.toHaveBeenCalled();
      expect(imageServiceMock.deleteStoredImage).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    describe("should delete the title and cleanup its resources", () => {
      it("if the title exists as a MOVIE", async () => {
        const title = {
          id: "title-1",
          type: TitleType.MOVIE,
          posterKey: "posters/titles/title-1/v1.webp",
          seasons: [],
          genres: [],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        const result = await service.delete("title-1");

        expect(mediaAssetServiceMock.cleanupVideoAsset).toHaveBeenCalledWith(
          "title-1",
          VideoType.MOVIE,
          "videos/title-1/",
        );
        expect(imageServiceMock.deleteStoredImage).toHaveBeenCalledWith(
          "posters/titles/title-1/v1.webp",
        );
        expect(prismaServiceMock.title.delete).toHaveBeenCalledWith({
          where: { id: "title-1" },
          include: { genres: true },
        });
        expect(result).toMatchObject({ id: title.id, type: title.type, genres: [] });
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
          posterKey: "posters/titles/title-1/v1.webp",
          seasons: [{ id: "season-1" }, { id: "season-2" }],
          genres: [],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        await service.delete("title-1");

        expect(imageServiceMock.deleteStoredImage).toHaveBeenCalledWith(
          "posters/titles/title-1/v1.webp",
        );
      });
    });

    describe("should let the database take the dependents", () => {
      it("deleting the row rather than clearing tables by hand", async () => {
        const title = {
          id: "title-1",
          type: TitleType.MOVIE,
          posterKey: "posters/titles/title-1/v1.webp",
          seasons: [],
          genres: [],
        };
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(title);
        (prismaServiceMock.title.delete as jest.Mock).mockResolvedValue(title);

        await service.delete("title-1");

        expect(prismaServiceMock.title.delete).toHaveBeenCalledWith({
          where: { id: "title-1" },
          include: { genres: true },
        });
        expect(imageServiceMock.deleteStoredImage).toHaveBeenCalledWith(
          "posters/titles/title-1/v1.webp",
        );
      });
    });

    describe("should throw NotFoundException", () => {
      it("if the title does not exist", async () => {
        (prismaServiceMock.title.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.delete("non-existent");

        await expect(action).rejects.toThrow(NotFoundException);
      });
    });
  });
});
