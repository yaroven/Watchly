import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { EpisodeExistsPipe } from "../episode/utils/episode-exists.pipe";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { EpisodeMediaController } from "./episode-media.controller";
import { MediaAssetService } from "./media-asset.service";

/**
 * Through the HTTP layer rather than by calling the handler: `EpisodeExistsPipe`
 * is a param pipe, and Nest does not run those on a direct method call.
 */
describe("EpisodeMediaController", () => {
  const EPISODE_ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let mediaAssetService: Record<string, jest.Mock>;
  let episodeExists: boolean;

  beforeEach(async () => {
    episodeExists = true;
    mediaAssetService = {
      startUpload: jest.fn().mockResolvedValue({ uploadId: "upload-1", parts: [] }),
      completeUpload: jest.fn().mockResolvedValue(undefined),
      abortUpload: jest.fn().mockResolvedValue(undefined),
      scheduleTranscode: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [EpisodeMediaController],
      providers: [
        EpisodeExistsPipe,
        { provide: MediaAssetService, useValue: mediaAssetService },
        {
          provide: PrismaService,
          useValue: {
            episode: {
              findUnique: jest.fn(() => Promise.resolve(episodeExists ? { id: EPISODE_ID } : null)),
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (_: ExecutionContext) => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: (_: ExecutionContext) => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe("transcode", () => {
    it("should schedule transcoding tagged as an episode", async () => {
      await request(app.getHttpServer()).post(`/episodes/${EPISODE_ID}/transcode`).expect(201);

      expect(mediaAssetService.scheduleTranscode).toHaveBeenCalledWith(
        EPISODE_ID,
        VideoType.EPISODE,
      );
    });

    it("should answer 404 for an episode that does not exist, without scheduling", async () => {
      episodeExists = false;

      await request(app.getHttpServer()).post(`/episodes/${EPISODE_ID}/transcode`).expect(404);

      expect(mediaAssetService.scheduleTranscode).not.toHaveBeenCalled();
    });
  });

  describe("startUpload", () => {
    it("should forward the id and size", async () => {
      await request(app.getHttpServer())
        .post(`/episodes/${EPISODE_ID}/upload-url`)
        .send({ fileSize: 1000 })
        .expect(201);

      expect(mediaAssetService.startUpload).toHaveBeenCalledWith(
        EPISODE_ID,
        1000,
        VideoType.EPISODE,
      );
    });

    it("should answer 404 for an episode that does not exist", async () => {
      episodeExists = false;

      await request(app.getHttpServer())
        .post(`/episodes/${EPISODE_ID}/upload-url`)
        .send({ fileSize: 1000 })
        .expect(404);

      expect(mediaAssetService.startUpload).not.toHaveBeenCalled();
    });
  });

  describe("completeUpload", () => {
    it("should forward the upload id and parts", async () => {
      const parts = [{ partNumber: 1, eTag: "etag-1" }];

      await request(app.getHttpServer())
        .post(`/episodes/${EPISODE_ID}/upload-url/complete`)
        .send({ uploadId: "upload-1", parts })
        .expect(201);

      expect(mediaAssetService.completeUpload).toHaveBeenCalledWith(
        EPISODE_ID,
        "upload-1",
        parts,
        VideoType.EPISODE,
      );
    });

    it("should answer 404 for an episode that does not exist", async () => {
      episodeExists = false;

      await request(app.getHttpServer())
        .post(`/episodes/${EPISODE_ID}/upload-url/complete`)
        .send({ uploadId: "upload-1", parts: [{ partNumber: 1, eTag: "etag-1" }] })
        .expect(404);

      expect(mediaAssetService.completeUpload).not.toHaveBeenCalled();
    });
  });

  // The one route that must work for an episode that is already gone: otherwise
  // the multipart parts it opened stay in S3 with nothing left to abort them.
  describe("abortUpload", () => {
    it("should abort even when the episode no longer exists", async () => {
      episodeExists = false;

      await request(app.getHttpServer())
        .delete(`/episodes/${EPISODE_ID}/upload-url/upload-1`)
        .expect(200);

      expect(mediaAssetService.abortUpload).toHaveBeenCalledWith(
        EPISODE_ID,
        "upload-1",
        VideoType.EPISODE,
      );
    });
  });
});
