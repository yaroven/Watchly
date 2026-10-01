import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { PosterService } from "./poster.service";

describe("PosterService", () => {
  let service: PosterService;
  let s3Service: jest.Mocked<
    Pick<
      S3Service,
      | "getUploadPresignedUrl"
      | "getReadPresignedUrl"
      | "objectExists"
      | "getPublicUrl"
      | "deleteObject"
    >
  >;

  beforeEach(async () => {
    s3Service = {
      getUploadPresignedUrl: jest.fn().mockResolvedValue("upload-url"),
      getReadPresignedUrl: jest.fn().mockResolvedValue("read-url"),
      objectExists: jest.fn().mockResolvedValue(true),
      getPublicUrl: jest.fn(
        (key: string, _type: BucketType) => `https://cdn.example.com/content/${key}`,
      ),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PosterService, { provide: S3Service, useValue: s3Service }],
    }).compile();

    service = moduleRef.get(PosterService);
  });

  describe("getPosterKey", () => {
    it.each([
      ["titles", "posters/titles/id-1"],
      ["seasons", "posters/seasons/id-1"],
      ["artists", "posters/artists/id-1"],
    ] as const)("puts %s in the key", (kind, expected) => {
      expect(service.getPosterKey(kind, "id-1")).toBe(expected);
    });
  });

  describe("createUploadUrl", () => {
    it("returns only the upload url", async () => {
      await expect(service.createUploadUrl("titles", "id-1")).resolves.toEqual({
        uploadUrl: "upload-url",
      });
    });

    /**
     * The whole point of this change. The read URL used to be issued here with
     * the default one-hour expiry, handed to the client, and sent back on the
     * next update to be written into the row — signature and all.
     */
    it("never issues a read url", async () => {
      await service.createUploadUrl("titles", "id-1");

      expect(s3Service.getReadPresignedUrl).not.toHaveBeenCalled();
    });

    it("keeps the upload window short and explicit", async () => {
      await service.createUploadUrl("titles", "id-1");

      expect(s3Service.getUploadPresignedUrl).toHaveBeenCalledWith(
        "posters/titles/id-1",
        BucketType.PROCESSED,
        120,
      );
    });
  });

  describe("confirmUpload", () => {
    it("returns the key once the object is there", async () => {
      await expect(service.confirmUpload("seasons", "id-1")).resolves.toBe("posters/seasons/id-1");
    });

    // "I uploaded it" is a claim by the client. Taking it on trust points the
    // row at nothing and renders a broken image for everyone.
    it("refuses a claim with no object behind it", async () => {
      s3Service.objectExists.mockResolvedValue(false);

      await expect(service.confirmUpload("seasons", "id-1")).rejects.toThrow(BadRequestException);
    });

    it("checks the same key it would return", async () => {
      await service.confirmUpload("artists", "id-1");

      expect(s3Service.objectExists).toHaveBeenCalledWith(
        "posters/artists/id-1",
        BucketType.PROCESSED,
      );
    });
  });

  describe("toPublicUrl", () => {
    it("derives an unsigned url from a stored key", () => {
      expect(service.toPublicUrl("posters/titles/id-1")).toBe(
        "https://cdn.example.com/content/posters/titles/id-1",
      );
    });

    it("carries no signature or expiry, unlike what used to be stored", () => {
      expect(service.toPublicUrl("posters/titles/id-1")).not.toMatch(/X-Amz-/);
    });

    it.each([null, undefined])("answers null for %p", (key) => {
      expect(service.toPublicUrl(key)).toBeNull();
    });
  });

  describe("deletePoster", () => {
    it("deletes the derived key from the processed bucket", async () => {
      await service.deletePoster("titles", "id-1");

      expect(s3Service.deleteObject).toHaveBeenCalledWith(
        "posters/titles/id-1",
        BucketType.PROCESSED,
      );
    });
  });
});
