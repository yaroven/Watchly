import { ExecutionContext, INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { VideoType } from "../../../services/queues/video-transcoder/enums/video-type.enum";
import { TitleEngagementService } from "../../../services/title-engagement/title-engagement.service";
import { TitleService } from "../../../services/title/title.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { TitlesController } from "./titles.controller";

describe("TitleMediaController", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let mediaAssetService: Record<string, jest.Mock>;
  let titleExists: boolean;

  beforeEach(async () => {
    titleExists = true;
    mediaAssetService = {
      startUpload: jest.fn().mockResolvedValue({ uploadId: "upload-1", parts: [] }),
      completeUpload: jest.fn().mockResolvedValue(undefined),
      abortUpload: jest.fn().mockResolvedValue(undefined),
      scheduleTranscode: jest.fn().mockResolvedValue(undefined),
      getPlaybackUrl: jest.fn().mockResolvedValue({ url: "https://example.test/m3u8" }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitlesController],
      providers: [
        TitleExistsPipe,
        { provide: TitleService, useValue: {} },
        { provide: TitleEngagementService, useValue: {} },
        { provide: MediaAssetService, useValue: mediaAssetService },
        {
          provide: PrismaService,
          useValue: {
            title: {
              findUnique: jest.fn(() => Promise.resolve(titleExists ? { id: TITLE_ID } : null)),
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

  describe("startUpload", () => {
    it("should forward the id and size, tagged as a movie", async () => {
      await request(app.getHttpServer())
        .post(`/titles/${TITLE_ID}/upload-url`)
        .send({ fileSize: 1000 })
        .expect(201);

      expect(mediaAssetService.startUpload).toHaveBeenCalledWith(TITLE_ID, 1000, VideoType.MOVIE);
    });

    it("should answer 404 for a title that does not exist, without starting an upload", async () => {
      titleExists = false;

      await request(app.getHttpServer())
        .post(`/titles/${TITLE_ID}/upload-url`)
        .send({ fileSize: 1000 })
        .expect(404);

      expect(mediaAssetService.startUpload).not.toHaveBeenCalled();
    });
  });

  describe("completeUpload", () => {
    it("should forward the upload id and parts", async () => {
      const parts = [{ partNumber: 1, eTag: "etag-1" }];

      await request(app.getHttpServer())
        .post(`/titles/${TITLE_ID}/upload-url/complete`)
        .send({ uploadId: "upload-1", parts })
        .expect(201);

      expect(mediaAssetService.completeUpload).toHaveBeenCalledWith(
        TITLE_ID,
        "upload-1",
        parts,
        VideoType.MOVIE,
      );
    });

    it("should answer 404 for a title that does not exist", async () => {
      titleExists = false;

      await request(app.getHttpServer())
        .post(`/titles/${TITLE_ID}/upload-url/complete`)
        .send({ uploadId: "upload-1", parts: [{ partNumber: 1, eTag: "etag-1" }] })
        .expect(404);

      expect(mediaAssetService.completeUpload).not.toHaveBeenCalled();
    });
  });

  describe("abortUpload", () => {
    it("should abort even when the title no longer exists", async () => {
      titleExists = false;

      await request(app.getHttpServer())
        .delete(`/titles/${TITLE_ID}/upload-url/upload-1`)
        .expect(200);

      expect(mediaAssetService.abortUpload).toHaveBeenCalledWith(
        TITLE_ID,
        "upload-1",
        VideoType.MOVIE,
      );
    });
  });

  describe("transcode", () => {
    it("should schedule transcoding for the movie", async () => {
      await request(app.getHttpServer()).post(`/titles/${TITLE_ID}/transcode`).expect(201);

      expect(mediaAssetService.scheduleTranscode).toHaveBeenCalledWith(TITLE_ID, VideoType.MOVIE);
    });

    it("should answer 404 for a title that does not exist, without scheduling", async () => {
      titleExists = false;

      await request(app.getHttpServer()).post(`/titles/${TITLE_ID}/transcode`).expect(404);

      expect(mediaAssetService.scheduleTranscode).not.toHaveBeenCalled();
    });
  });

  describe("getPlaybackUrl", () => {
    it("should ask for the movie's manifest without a separate existence check", async () => {
      titleExists = false;

      await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/video`).expect(200);

      expect(mediaAssetService.getPlaybackUrl).toHaveBeenCalledWith({
        type: VideoType.MOVIE,
        titleId: TITLE_ID,
      });
    });

    it("should surface the 404 the media service raises", async () => {
      mediaAssetService.getPlaybackUrl.mockRejectedValue(
        new NotFoundException("This title has no playable media yet"),
      );

      await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/video`).expect(404);
    });
  });
});
