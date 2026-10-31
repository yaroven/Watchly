import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ImageKind, imageProfile } from "../queues/image-transcoder/image-profile.const";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { ImageService } from "./image.service";

describe("ImageService", () => {
  const OWNER = "11111111-1111-4111-8111-111111111111";

  let service: ImageService;
  let s3: {
    getUploadPresignedUrl: jest.Mock;
    deleteObject: jest.Mock;
    getPublicUrl: jest.Mock;
  };
  let prisma: Record<
    "title" | "season" | "artist" | "user",
    { findUnique: jest.Mock; update: jest.Mock }
  >;

  const table = () => ({ findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) });

  beforeEach(async () => {
    s3 = {
      getUploadPresignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/raw/signed"),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/content/${key}`),
    };
    prisma = { title: table(), season: table(), artist: table(), user: table() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ImageService,
        { provide: S3Service, useValue: s3 },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ImageService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createUploadUrl", () => {
    it.each([
      [ImageKind.TITLE_POSTER, "title-poster"],
      [ImageKind.SEASON_POSTER, "season-poster"],
      [ImageKind.ARTIST_PHOTO, "artist-photo"],
      [ImageKind.USER_AVATAR, "user-avatar"],
    ])("puts a %s upload under its raw kind and the owner's id", async (kind, prefix) => {
      const { rawKey } = await service.createUploadUrl(kind, OWNER, { contentType: "image/png" });

      expect(rawKey).toMatch(new RegExp(`^${prefix}/${OWNER}/[0-9a-f-]{36}$`));
    });

    it("never presigns into the processed bucket", async () => {
      await service.createUploadUrl(ImageKind.TITLE_POSTER, OWNER, { contentType: "image/png" });

      expect(s3.getUploadPresignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        BucketType.RAW,
        expect.any(Number),
        expect.any(String),
      );
    });

    it("signs the URL for the content type it was told", async () => {
      await service.createUploadUrl(ImageKind.USER_AVATAR, OWNER, { contentType: "image/webp" });

      expect(s3.getUploadPresignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        BucketType.RAW,
        120,
        "image/webp",
      );
    });

    it("names a fresh key per upload, so two racing uploads do not collide", async () => {
      const first = await service.createUploadUrl(ImageKind.ARTIST_PHOTO, OWNER, {
        contentType: "image/jpeg",
      });
      const second = await service.createUploadUrl(ImageKind.ARTIST_PHOTO, OWNER, {
        contentType: "image/jpeg",
      });

      expect(first.rawKey).not.toBe(second.rawKey);
    });

    it("tells the client the limit the worker will enforce for that kind", async () => {
      const result = await service.createUploadUrl(ImageKind.SEASON_POSTER, OWNER, {
        contentType: "image/png",
      });

      expect(result).toEqual({
        uploadUrl: "https://s3.example.com/raw/signed",
        rawKey: expect.any(String),
        maxBytes: imageProfile(ImageKind.SEASON_POSTER).maxUploadBytes,
      });
    });

    it("refuses a content type the worker does not convert, without presigning", async () => {
      await expect(
        service.createUploadUrl(ImageKind.TITLE_POSTER, OWNER, { contentType: "image/gif" }),
      ).rejects.toThrow(BadRequestException);
      expect(s3.getUploadPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe("buildProcessedKey", () => {
    it.each([
      [ImageKind.TITLE_POSTER, `posters/titles/${OWNER}/v1.webp`],
      [ImageKind.SEASON_POSTER, `posters/seasons/${OWNER}/v1.webp`],
      [ImageKind.ARTIST_PHOTO, `posters/artists/${OWNER}/v1.webp`],
      [ImageKind.USER_AVATAR, `avatars/${OWNER}/v1.webp`],
    ])("keeps the %s key layout already stored on rows", (kind, key) => {
      expect(service.buildProcessedKey(kind, OWNER, "v1")).toBe(key);
    });

    it("changes with the version, so a viewer's cache never serves the old image", () => {
      expect(service.buildProcessedKey(ImageKind.USER_AVATAR, OWNER, "v1")).not.toBe(
        service.buildProcessedKey(ImageKind.USER_AVATAR, OWNER, "v2"),
      );
    });
  });

  describe("attachProcessed", () => {
    it.each([
      [ImageKind.TITLE_POSTER, "title", "posterKey"],
      [ImageKind.SEASON_POSTER, "season", "posterKey"],
      [ImageKind.ARTIST_PHOTO, "artist", "photoKey"],
      [ImageKind.USER_AVATAR, "user", "avatarKey"],
    ] as const)("records a %s key on %s.%s", async (kind, model, column) => {
      prisma[model].findUnique.mockResolvedValue({ [column]: null });

      await service.attachProcessed(kind, OWNER, "new.webp");

      expect(prisma[model].update).toHaveBeenCalledWith({
        where: { id: OWNER },
        data: { [column]: "new.webp" },
      });
    });

    it("removes the version it supersedes", async () => {
      prisma.title.findUnique.mockResolvedValue({ posterKey: "old.webp" });

      await service.attachProcessed(ImageKind.TITLE_POSTER, OWNER, "new.webp");

      expect(s3.deleteObject).toHaveBeenCalledWith("old.webp", BucketType.PROCESSED);
    });

    it("keeps the object when the key has not moved", async () => {
      prisma.user.findUnique.mockResolvedValue({ avatarKey: "same.webp" });

      await service.attachProcessed(ImageKind.USER_AVATAR, OWNER, "same.webp");

      expect(s3.deleteObject).not.toHaveBeenCalled();
    });

    describe("when the owner went away mid-flight", () => {
      beforeEach(() => prisma.artist.findUnique.mockResolvedValue(null));

      it("refuses rather than writing", async () => {
        await expect(
          service.attachProcessed(ImageKind.ARTIST_PHOTO, OWNER, "new.webp"),
        ).rejects.toThrow(NotFoundException);
        expect(prisma.artist.update).not.toHaveBeenCalled();
      });

      it("drops the object it has no owner for", async () => {
        await service
          .attachProcessed(ImageKind.ARTIST_PHOTO, OWNER, "new.webp")
          .catch(() => undefined);

        expect(s3.deleteObject).toHaveBeenCalledWith("new.webp", BucketType.PROCESSED);
      });
    });
  });

  describe("remove", () => {
    it("clears the column before deleting the object, so no row points at nothing", async () => {
      const calls: string[] = [];
      prisma.season.findUnique.mockResolvedValue({ posterKey: "stored.webp" });
      prisma.season.update.mockImplementation(() => {
        calls.push("clear");
        return Promise.resolve({});
      });
      s3.deleteObject.mockImplementation(() => {
        calls.push("delete");
        return Promise.resolve();
      });

      await service.remove(ImageKind.SEASON_POSTER, OWNER);

      expect(prisma.season.update).toHaveBeenCalledWith({
        where: { id: OWNER },
        data: { posterKey: null },
      });
      expect(s3.deleteObject).toHaveBeenCalledWith("stored.webp", BucketType.PROCESSED);
      expect(calls).toEqual(["clear", "delete"]);
    });

    it("does nothing for an owner with no image", async () => {
      prisma.user.findUnique.mockResolvedValue({ avatarKey: null });

      await service.remove(ImageKind.USER_AVATAR, OWNER);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(s3.deleteObject).not.toHaveBeenCalled();
    });

    it("does nothing for an owner that is gone", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await service.remove(ImageKind.TITLE_POSTER, OWNER);

      expect(prisma.title.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteStoredImage", () => {
    it("ignores an owner that never had an image", async () => {
      await service.deleteStoredImage(null);

      expect(s3.deleteObject).not.toHaveBeenCalled();
    });

    it("swallows a storage failure", async () => {
      s3.deleteObject.mockRejectedValue(new Error("S3 down"));

      await expect(service.deleteStoredImage("k.webp")).resolves.toBeUndefined();
    });
  });

  describe("toPublicUrl", () => {
    it("derives an unsigned url into the processed bucket", () => {
      expect(service.toPublicUrl("avatars/u/v.webp")).toBe(
        "https://cdn.example.com/content/avatars/u/v.webp",
      );
      expect(s3.getPublicUrl).toHaveBeenCalledWith("avatars/u/v.webp", BucketType.PROCESSED);
    });

    it("stays null for an owner with no image", () => {
      expect(service.toPublicUrl(null)).toBeNull();
    });
  });
});
