import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Job } from "bullmq";
import { Readable } from "node:stream";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";
import { AVATAR_MAX_UPLOAD_BYTES } from "./avatar-image.const";
import { AvatarImageConverter } from "./avatar-image.converter";
import { ProcessAvatarJob } from "./avatar-queue.options";
import { UserAvatarProcessor } from "./user-avatar.processor";
import { UserAvatarService } from "./user-avatar.service";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const UPLOAD_ID = "22222222-2222-2222-2222-222222222222";
const RAW_KEY = `user-avatar/${USER_ID}/${UPLOAD_ID}`;
const AVATAR_KEY = `avatars/${USER_ID}/${UPLOAD_ID}.webp`;

/** `attemptsMade` counts the attempt currently running, so 3 of 3 is the last one. */
const buildJob = (attemptsMade: number, attempts = 3) =>
  ({
    id: `avatar-${RAW_KEY}`,
    data: { userId: USER_ID, rawKey: RAW_KEY } satisfies ProcessAvatarJob,
    attemptsMade,
    opts: { attempts },
  }) as unknown as Job<ProcessAvatarJob>;

describe("UserAvatarProcessor", () => {
  let processor: UserAvatarProcessor;
  let s3Service: jest.Mocked<Pick<S3Service, "get" | "uploadStream" | "deleteObject">>;
  let converter: jest.Mocked<Pick<AvatarImageConverter, "assertDecodableImage" | "toSquareWebp">>;
  let userAvatarService: jest.Mocked<Pick<UserAvatarService, "attachProcessedAvatar">>;

  beforeEach(async () => {
    s3Service = {
      // Small enough to pass the size check; the converter is mocked, so the
      // bytes themselves never have to be a real image.
      get: jest.fn().mockImplementation(() => Promise.resolve(Readable.from(["original"]))),
      uploadStream: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    converter = {
      assertDecodableImage: jest.fn().mockResolvedValue(undefined),
      // The real converter writes the output file; stand in for it so the
      // processor finds something to upload and to stat.
      toSquareWebp: jest.fn().mockImplementation(async (_input: string, output: string) => {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(output, "webp");
      }),
    };
    userAvatarService = { attachProcessedAvatar: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserAvatarProcessor,
        { provide: S3Service, useValue: s3Service },
        { provide: AvatarImageConverter, useValue: converter },
        { provide: UserAvatarService, useValue: userAvatarService },
      ],
    }).compile();

    processor = moduleRef.get(UserAvatarProcessor);
    // The failure paths log by design; keep the expected noise out of the run.
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("converts, uploads under the user's avatar key and attaches it", async () => {
    const result = await processor.process(buildJob(1));

    expect(result).toEqual({ avatarKey: AVATAR_KEY });
    expect(s3Service.uploadStream).toHaveBeenCalledWith(
      BucketType.PROCESSED,
      AVATAR_KEY,
      expect.anything(),
      "image/webp",
    );
    expect(userAvatarService.attachProcessedAvatar).toHaveBeenCalledWith(USER_ID, AVATAR_KEY);
  });

  it("deletes the original once it has been processed", async () => {
    await processor.process(buildJob(1));

    expect(s3Service.deleteObject).toHaveBeenCalledWith(RAW_KEY, BucketType.RAW);
  });

  it("keeps the original when a retry is still coming, so the retry can read it", async () => {
    converter.toSquareWebp.mockRejectedValue(new Error("ffmpeg blew up"));

    await expect(processor.process(buildJob(1))).rejects.toThrow("ffmpeg blew up");
    expect(s3Service.deleteObject).not.toHaveBeenCalled();
  });

  it("deletes the original once the last attempt has failed", async () => {
    converter.toSquareWebp.mockRejectedValue(new Error("ffmpeg blew up"));

    await expect(processor.process(buildJob(3))).rejects.toThrow("ffmpeg blew up");
    expect(s3Service.deleteObject).toHaveBeenCalledWith(RAW_KEY, BucketType.RAW);
  });

  it("deletes an upload that was never attached when the last attempt fails", async () => {
    userAvatarService.attachProcessedAvatar.mockRejectedValue(new Error("db down"));

    await expect(processor.process(buildJob(3))).rejects.toThrow("db down");
    expect(s3Service.deleteObject).toHaveBeenCalledWith(AVATAR_KEY, BucketType.PROCESSED);
  });

  it("leaves the processed bucket alone when the job failed before uploading", async () => {
    converter.assertDecodableImage.mockRejectedValue(new Error("not an image"));

    await expect(processor.process(buildJob(3))).rejects.toThrow("not an image");
    expect(s3Service.deleteObject).not.toHaveBeenCalledWith(
      expect.anything(),
      BucketType.PROCESSED,
    );
  });

  it("rejects an original larger than the upload limit", async () => {
    const oversized = "x".repeat(AVATAR_MAX_UPLOAD_BYTES + 1);
    s3Service.get.mockImplementation(() => Promise.resolve(Readable.from([oversized])));

    await expect(processor.process(buildJob(1))).rejects.toThrow(/over the/);
    expect(s3Service.uploadStream).not.toHaveBeenCalled();
  });
});
