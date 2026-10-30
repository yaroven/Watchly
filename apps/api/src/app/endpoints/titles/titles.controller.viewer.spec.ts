import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../../../guards/optional-jwt-auth.guard";
import { MediaAssetService } from "../../../services/media-asset/media-asset.service";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { TitleEngagementService } from "../../../services/title-engagement/title-engagement.service";
import { TitleService } from "../../../services/title/title.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { TitlesController } from "./titles.controller";

describe("TitlesController (viewer propagation)", () => {
  let app: INestApplication;
  let titleService: Record<string, jest.Mock>;
  let viewerId: string | undefined;
  let titleExists: boolean;

  beforeEach(async () => {
    titleExists = true;
    titleService = {
      findOne: jest.fn().mockResolvedValue({ id: "title-1" }),
      findAll: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      getEngagement: jest.fn().mockResolvedValue({}),
      rate: jest.fn().mockResolvedValue({}),
      removeRating: jest.fn().mockResolvedValue({}),
      react: jest.fn().mockResolvedValue({}),
      removeReaction: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitlesController],
      providers: [
        TitleExistsPipe,
        { provide: TitleService, useValue: titleService },
        { provide: TitleEngagementService, useValue: titleService },
        { provide: MediaAssetService, useValue: {} },
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
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ userId?: string }>().userId = viewerId;
          return true;
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ userId?: string; viewerScope?: string }>().userId =
            viewerId;
          context.switchToHttp().getRequest<{ viewerScope?: string }>().viewerScope = "required";
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe("the existence pipe on the engagement writes", () => {
    beforeEach(() => {
      viewerId = "user-1";
      titleExists = false;
    });

    it("should answer 404 for a missing title without setting a score", async () => {
      await request(app.getHttpServer())
        .put(`/titles/${TITLE_ID}/rating`)
        .send({ score: 9 })
        .expect(404);

      expect(titleService.rate).not.toHaveBeenCalled();
    });

    it("should answer 404 for a missing title without casting a vote", async () => {
      await request(app.getHttpServer())
        .post(`/titles/${TITLE_ID}/reaction`)
        .send({ type: "LIKE" })
        .expect(404);

      expect(titleService.react).not.toHaveBeenCalled();
    });

    it("should answer 404 for a missing title without withdrawing a score", async () => {
      await request(app.getHttpServer()).delete(`/titles/${TITLE_ID}/rating`).expect(404);

      expect(titleService.removeRating).not.toHaveBeenCalled();
    });

    it("should answer 404 for a missing title without withdrawing a vote", async () => {
      await request(app.getHttpServer()).delete(`/titles/${TITLE_ID}/reaction`).expect(404);

      expect(titleService.removeReaction).not.toHaveBeenCalled();
    });
  });

  describe("GET /title/:id", () => {
    it("should pass the signed-in viewer through to the service", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer())
        .get("/titles/11111111-1111-4111-8111-111111111111")
        .expect(200);

      expect(titleService.findOne).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        "user-1",
      );
    });

    it("should pass no viewer for an anonymous caller", async () => {
      viewerId = undefined;

      await request(app.getHttpServer())
        .get("/titles/11111111-1111-4111-8111-111111111111")
        .expect(200);

      expect(titleService.findOne).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        undefined,
      );
    });
  });

  describe("GET /title", () => {
    it("should pass the signed-in viewer through to the service", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer()).get("/titles").expect(200);

      expect(titleService.findAll).toHaveBeenCalledWith(expect.anything(), undefined, [], "user-1");
    });
  });

  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  describe("engagement", () => {
    it("should let an anonymous caller read the summary", async () => {
      viewerId = undefined;

      await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/engagement`).expect(200);

      expect(titleService.getEngagement).toHaveBeenCalledWith(TITLE_ID, null);
    });

    it("should pass the viewer when reading the summary signed in", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/engagement`).expect(200);

      expect(titleService.getEngagement).toHaveBeenCalledWith(TITLE_ID, "user-1");
    });

    it("should pass the viewer when setting a score", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer())
        .put(`/titles/${TITLE_ID}/rating`)
        .send({ score: 8 })
        .expect(200);

      expect(titleService.rate).toHaveBeenCalledWith(TITLE_ID, "user-1", 8);
    });

    it("should refuse to withdraw a score without a viewer", async () => {
      viewerId = undefined;

      await request(app.getHttpServer()).delete(`/titles/${TITLE_ID}/rating`).expect(500);

      expect(titleService.removeRating).not.toHaveBeenCalled();
    });
  });
});
