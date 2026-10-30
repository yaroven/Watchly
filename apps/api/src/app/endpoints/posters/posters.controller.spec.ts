import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { PosterService } from "../../../services/poster/poster.service";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { SeasonPosterController, TitlePosterController } from "./posters.controller";

describe("TitlePosterController", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let posterService: { createUploadUrl: jest.Mock };
  let titleExists: boolean;

  beforeEach(async () => {
    titleExists = true;
    posterService = {
      createUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: "https://example.test/put",
        rawKey: "title-poster/id/abc",
        maxBytes: 15 * 1024 * 1024,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitlePosterController],
      providers: [
        TitleExistsPipe,
        { provide: PosterService, useValue: posterService },
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

  it("should ask for an upload url under the titles poster kind", async () => {
    const response = await request(app.getHttpServer())
      .get(`/titles/${TITLE_ID}/poster-upload-url`)
      .expect(200);

    expect(posterService.createUploadUrl).toHaveBeenCalledWith("titles", TITLE_ID);
    expect(response.body).toEqual({
      uploadUrl: "https://example.test/put",
      rawKey: "title-poster/id/abc",
      maxBytes: 15 * 1024 * 1024,
    });
  });

  it("should answer with the upload target and no read url", async () => {
    const response = await request(app.getHttpServer())
      .get(`/titles/${TITLE_ID}/poster-upload-url`)
      .expect(200);

    expect(Object.keys(response.body as object).sort()).toEqual([
      "maxBytes",
      "rawKey",
      "uploadUrl",
    ]);
  });

  it("should answer 404 for a title that does not exist, without presigning", async () => {
    titleExists = false;

    await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/poster-upload-url`).expect(404);

    expect(posterService.createUploadUrl).not.toHaveBeenCalled();
  });
});

describe("SeasonPosterController", () => {
  const SEASON_ID = "22222222-2222-4222-8222-222222222222";

  let app: INestApplication;
  let posterService: { createUploadUrl: jest.Mock };
  let seasonExists: boolean;

  beforeEach(async () => {
    seasonExists = true;
    posterService = {
      createUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: "https://example.test/put",
        rawKey: "title-poster/id/abc",
        maxBytes: 15 * 1024 * 1024,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SeasonPosterController],
      providers: [
        SeasonExistsPipe,
        { provide: PosterService, useValue: posterService },
        {
          provide: PrismaService,
          useValue: {
            season: {
              findUnique: jest.fn(() => Promise.resolve(seasonExists ? { id: SEASON_ID } : null)),
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

  it("should ask for an upload url under the seasons poster kind", async () => {
    await request(app.getHttpServer()).get(`/seasons/${SEASON_ID}/poster-upload-url`).expect(200);

    expect(posterService.createUploadUrl).toHaveBeenCalledWith("seasons", SEASON_ID);
  });

  it("should answer 404 for a season that does not exist, without presigning", async () => {
    seasonExists = false;

    await request(app.getHttpServer()).get(`/seasons/${SEASON_ID}/poster-upload-url`).expect(404);

    expect(posterService.createUploadUrl).not.toHaveBeenCalled();
  });
});
