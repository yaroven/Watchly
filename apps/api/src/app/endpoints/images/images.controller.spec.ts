import { ExecutionContext, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { ImageService } from "../../../services/image/image.service";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { ImageKind } from "../../../services/queues/image-transcoder/image-profile.const";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import {
  ArtistPhotoController,
  SeasonPosterController,
  TitlePosterController,
  UserAvatarController,
} from "./images.controller";

describe("Image routes", () => {
  const OWNER = "11111111-1111-4111-8111-111111111111";
  const VIEWER = "22222222-2222-4222-8222-222222222222";

  let app: INestApplication;
  let images: { createUploadUrl: jest.Mock; remove: jest.Mock };
  let ownerExists: boolean;

  beforeEach(async () => {
    ownerExists = true;
    images = {
      createUploadUrl: jest
        .fn()
        .mockResolvedValue({ uploadUrl: "https://s3/put", rawKey: "raw/key", maxBytes: 10 }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const lookup = {
      findUnique: jest.fn(() => Promise.resolve(ownerExists ? { id: OWNER } : null)),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [
        TitlePosterController,
        SeasonPosterController,
        ArtistPhotoController,
        UserAvatarController,
      ],
      providers: [
        TitleExistsPipe,
        SeasonExistsPipe,
        ArtistExistsPipe,
        { provide: ImageService, useValue: images },
        { provide: PrismaService, useValue: { title: lookup, season: lookup, artist: lookup } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<{ userId?: string; viewerScope?: string }>();
          req.userId = VIEWER;
          req.viewerScope = "required";
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe.each([
    ["titles", "poster", ImageKind.TITLE_POSTER],
    ["seasons", "poster", ImageKind.SEASON_POSTER],
    ["artists", "photo", ImageKind.ARTIST_PHOTO],
  ])("/%s/:id/%s", (collection, image, kind) => {
    const base = `/${collection}/${OWNER}/${image}`;

    it("answers an upload target for the owner's kind", async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/upload-url`)
        .send({ contentType: "image/png" })
        .expect(200);

      expect(response.body).toEqual({
        uploadUrl: "https://s3/put",
        rawKey: "raw/key",
        maxBytes: 10,
      });
      expect(images.createUploadUrl).toHaveBeenCalledWith(kind, OWNER, {
        contentType: "image/png",
      });
    });

    it("refuses a type the worker does not convert before presigning", async () => {
      await request(app.getHttpServer())
        .post(`${base}/upload-url`)
        .send({ contentType: "application/pdf" })
        .expect(400);

      expect(images.createUploadUrl).not.toHaveBeenCalled();
    });

    it("refuses the old boolean flag rather than ignoring it", async () => {
      await request(app.getHttpServer())
        .post(`${base}/upload-url`)
        .send({ contentType: "image/png", posterUploaded: true })
        .expect(400);
    });

    it("answers 404 for an owner that does not exist, without presigning", async () => {
      ownerExists = false;

      await request(app.getHttpServer())
        .post(`${base}/upload-url`)
        .send({ contentType: "image/png" })
        .expect(404);

      expect(images.createUploadUrl).not.toHaveBeenCalled();
    });

    it("removes the image with 204", async () => {
      await request(app.getHttpServer()).delete(base).expect(204);

      expect(images.remove).toHaveBeenCalledWith(kind, OWNER);
    });

    it("answers 404 when removing from an owner that does not exist", async () => {
      ownerExists = false;

      await request(app.getHttpServer()).delete(base).expect(404);

      expect(images.remove).not.toHaveBeenCalled();
    });
  });

  describe("/users/me/avatar", () => {
    it("uploads for the signed-in viewer, never an id from the request", async () => {
      await request(app.getHttpServer())
        .post("/users/me/avatar/upload-url")
        .send({ contentType: "image/webp" })
        .expect(200);

      expect(images.createUploadUrl).toHaveBeenCalledWith(ImageKind.USER_AVATAR, VIEWER, {
        contentType: "image/webp",
      });
    });

    it("removes the viewer's own avatar with 204", async () => {
      await request(app.getHttpServer()).delete("/users/me/avatar").expect(204);

      expect(images.remove).toHaveBeenCalledWith(ImageKind.USER_AVATAR, VIEWER);
    });
  });
});
