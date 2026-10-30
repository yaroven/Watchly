import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ImageKind, imageProfile } from "../queues/image-transcoder/image-profile.const";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { PosterService } from "./poster.service";

describe("PosterService", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  let service: PosterService;
  let s3Service: {
    getUploadPresignedUrl: jest.Mock;
    getReadPresignedUrl: jest.Mock;
    objectExists: jest.Mock;
    getPublicUrl: jest.Mock;
    deleteObject: jest.Mock;
  };
  let prisma: {
    title: { findUnique: jest.Mock; update: jest.Mock };
    season: { findUnique: jest.Mock; update: jest.Mock };
    artist: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    s3Service = {
      getUploadPresignedUrl: jest.fn().mockResolvedValue("upload-url"),
      getReadPresignedUrl: jest.fn().mockResolvedValue("read-url"),
      objectExists: jest.fn().mockResolvedValue(true),
      getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/content/${key}`),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      title: { findUnique: jest.fn(), update: jest.fn() },
      season: { findUnique: jest.fn(), update: jest.fn() },
      artist: { findUnique: jest.fn(), update: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PosterService,
        { provide: S3Service, useValue: s3Service },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PosterService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createUploadUrl", () => {
    it.each([
      ["titles", "title-poster"],
      ["seasons", "season-poster"],
      ["artists", "artist-photo"],
    ] as const)("puts a %s upload under the %s raw prefix", async (kind, prefix) => {
      const result = await service.createUploadUrl(kind, "id-1");

      const [key, bucket, ttl] = s3Service.getUploadPresignedUrl.mock.calls[0] as [
        string,
        BucketType,
        number,
      ];
      expect(key.startsWith(`${prefix}/id-1/`)).toBe(true);
      expect(bucket).toBe(BucketType.RAW);
      expect(ttl).toBe(120);
      expect(result.rawKey).toBe(key);
    });

    it("never presigns into the processed bucket", async () => {
      await service.createUploadUrl("titles", "id-1");

      expect(s3Service.getUploadPresignedUrl).not.toHaveBeenCalledWith(
        expect.anything(),
        BucketType.PROCESSED,
        expect.anything(),
      );
    });

    it("names a fresh key per upload, so two racing uploads do not collide", async () => {
      const first = await service.createUploadUrl("titles", "id-1");
      const second = await service.createUploadUrl("titles", "id-1");

      expect(first.rawKey).not.toBe(second.rawKey);
    });

    it("tells the client the limit the worker will enforce", async () => {
      const { maxBytes } = await service.createUploadUrl("seasons", "id-1");

      expect(maxBytes).toBe(imageProfile(ImageKind.SEASON_POSTER).maxUploadBytes);
    });

    it("never issues a read url", async () => {
      await service.createUploadUrl("titles", "id-1");

      expect(s3Service.getReadPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe("buildProcessedKey", () => {
    it.each([
      ["titles", "posters/titles/id-1/v1.webp"],
      ["seasons", "posters/seasons/id-1/v1.webp"],
      ["artists", "posters/artists/id-1/v1.webp"],
    ] as const)("puts %s and the version in the key", (kind, expected) => {
      expect(service.buildProcessedKey(kind, "id-1", "v1")).toBe(expected);
    });

    it("changes with the version", () => {
      expect(service.buildProcessedKey("titles", "id-1", "v1")).not.toBe(
        service.buildProcessedKey("titles", "id-1", "v2"),
      );
    });
  });

  describe("attachProcessed", () => {
    it("records the key on the title", async () => {
      prisma.title.findUnique.mockResolvedValue({ posterKey: null });

      await service.attachProcessed("titles", TITLE_ID, "posters/titles/id/v2.webp");

      expect(prisma.title.update).toHaveBeenCalledWith({
        where: { id: TITLE_ID },
        data: { posterKey: "posters/titles/id/v2.webp" },
      });
    });

    it("records the key on the artist's photo column", async () => {
      prisma.artist.findUnique.mockResolvedValue({ photoKey: null });

      await service.attachProcessed("artists", "artist-1", "posters/artists/id/v2.webp");

      expect(prisma.artist.update).toHaveBeenCalledWith({
        where: { id: "artist-1" },
        data: { photoKey: "posters/artists/id/v2.webp" },
      });
    });

    it("removes the version it supersedes", async () => {
      prisma.season.findUnique.mockResolvedValue({ posterKey: "posters/seasons/id/v1.webp" });

      await service.attachProcessed("seasons", "season-1", "posters/seasons/id/v2.webp");

      expect(s3Service.deleteObject).toHaveBeenCalledWith(
        "posters/seasons/id/v1.webp",
        BucketType.PROCESSED,
      );
    });

    it("keeps the object when the key has not moved", async () => {
      prisma.title.findUnique.mockResolvedValue({ posterKey: "posters/titles/id/v1.webp" });

      await service.attachProcessed("titles", TITLE_ID, "posters/titles/id/v1.webp");

      expect(s3Service.deleteObject).not.toHaveBeenCalled();
    });

    describe("when the row went away mid-flight", () => {
      beforeEach(() => prisma.title.findUnique.mockResolvedValue(null));

      it("refuses rather than writing", async () => {
        const action = service.attachProcessed("titles", TITLE_ID, "posters/titles/id/v2.webp");

        await expect(action).rejects.toThrow(NotFoundException);
        expect(prisma.title.update).not.toHaveBeenCalled();
      });

      it("drops the object it has no owner for", async () => {
        await expect(
          service.attachProcessed("titles", TITLE_ID, "posters/titles/id/v2.webp"),
        ).rejects.toThrow(NotFoundException);

        expect(s3Service.deleteObject).toHaveBeenCalledWith(
          "posters/titles/id/v2.webp",
          BucketType.PROCESSED,
        );
      });
    });
  });

  describe("removeStoredImage", () => {
    it("deletes the key the row actually holds, not a derived one", async () => {
      prisma.title.findUnique.mockResolvedValue({ posterKey: "posters/titles/id/v1.webp" });

      await service.removeStoredImage("titles", TITLE_ID);

      expect(s3Service.deleteObject).toHaveBeenCalledWith(
        "posters/titles/id/v1.webp",
        BucketType.PROCESSED,
      );
    });

    it("does nothing for a row with no image on it", async () => {
      prisma.title.findUnique.mockResolvedValue({ posterKey: null });

      await service.removeStoredImage("titles", TITLE_ID);

      expect(s3Service.deleteObject).not.toHaveBeenCalled();
    });

    it("writes nothing — the caller's own update clears the column", async () => {
      prisma.title.findUnique.mockResolvedValue({ posterKey: "posters/titles/id/v1.webp" });

      await service.removeStoredImage("titles", TITLE_ID);

      expect(prisma.title.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteStoredImage", () => {
    it.each([null, undefined])("answers without a call for %p", async (key) => {
      await service.deleteStoredImage(key);

      expect(s3Service.deleteObject).not.toHaveBeenCalled();
    });

    it("swallows a storage failure", async () => {
      s3Service.deleteObject.mockRejectedValue(new Error("s3 down"));

      await expect(service.deleteStoredImage("posters/titles/id/v1.webp")).resolves.toBeUndefined();
    });
  });

  describe("toPublicUrl", () => {
    it("derives an unsigned url from a stored key", () => {
      expect(service.toPublicUrl("posters/titles/id-1/v1.webp")).toBe(
        "https://cdn.example.com/content/posters/titles/id-1/v1.webp",
      );
    });

    it("carries no signature or expiry, unlike what used to be stored", () => {
      expect(service.toPublicUrl("posters/titles/id-1/v1.webp")).not.toMatch(/X-Amz-/);
    });

    it.each([null, undefined])("answers null for %p", (key) => {
      expect(service.toPublicUrl(key)).toBeNull();
    });
  });
});
