import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

/**
 * Through the HTTP layer rather than by calling the handler: Nest does not run a
 * param decorator on a direct method call, so a unit spec cannot tell
 * `@OptionalUserId()` from a hardcoded `undefined` — and that difference is every
 * signed-in viewer reading as anonymous.
 *
 * `viewer-pairing.spec.ts` now checks the decorator pairing itself, on every route
 * there is. What stays here is the other half: that the value actually arrives.
 * The engagement cases came from the two controller specs that merged into this
 * one; the pairing-only cases they carried were dropped rather than kept as
 * duplicates.
 */
describe("TitleController (viewer propagation)", () => {
  let app: INestApplication;
  let titleService: Record<string, jest.Mock>;
  let viewerId: string | undefined;

  beforeEach(async () => {
    titleService = {
      findOne: jest.fn().mockResolvedValue({ id: "title-1" }),
      findAll: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      summarizeEngagement: jest.fn().mockResolvedValue({}),
      rate: jest.fn().mockResolvedValue({}),
      removeRating: jest.fn().mockResolvedValue({}),
      react: jest.fn().mockResolvedValue({}),
      removeReaction: jest.fn().mockResolvedValue({}),
      addToWatchlist: jest.fn().mockResolvedValue({}),
      removeFromWatchlist: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitleController],
      providers: [{ provide: TitleService, useValue: titleService }],
    })
      // Stands in for a real token: whatever the guard would have attached.
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ userId?: string }>().userId = viewerId;
          return true;
        },
      })
      // The signed-in routes reach `@CurrentUserId()`, which refuses an unset
      // viewer with a 500 — which is the behaviour two of the cases below pin.
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

  describe("GET /title/:id", () => {
    it("should pass the signed-in viewer through to the service", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer())
        .get("/title/11111111-1111-4111-8111-111111111111")
        .expect(200);

      expect(titleService.findOne).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        "user-1",
      );
    });

    it("should pass no viewer for an anonymous caller", async () => {
      viewerId = undefined;

      await request(app.getHttpServer())
        .get("/title/11111111-1111-4111-8111-111111111111")
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

      await request(app.getHttpServer()).get("/title").expect(200);

      expect(titleService.findAll).toHaveBeenCalledWith(expect.anything(), undefined, [], "user-1");
    });
  });

  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  describe("engagement", () => {
    it("should let an anonymous caller read the summary", async () => {
      viewerId = undefined;

      await request(app.getHttpServer()).get(`/title/${TITLE_ID}/engagement`).expect(200);

      expect(titleService.summarizeEngagement).toHaveBeenCalledWith(TITLE_ID, null);
    });

    it("should pass the viewer when reading the summary signed in", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer()).get(`/title/${TITLE_ID}/engagement`).expect(200);

      expect(titleService.summarizeEngagement).toHaveBeenCalledWith(TITLE_ID, "user-1");
    });

    it("should pass the viewer when setting a score", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer())
        .put(`/title/${TITLE_ID}/rating`)
        .send({ score: 8 })
        .expect(200);

      expect(titleService.rate).toHaveBeenCalledWith(TITLE_ID, "user-1", 8);
    });

    it("should pass the viewer to react", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer())
        .post(`/title/${TITLE_ID}/reaction`)
        .send({ type: "LIKE" })
        .expect(200);

      expect(titleService.react).toHaveBeenCalledWith(TITLE_ID, "user-1", "LIKE");
    });

    it("should pass the viewer to addToWatchlist", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer()).post(`/title/${TITLE_ID}/watchlist`).expect(200);

      expect(titleService.addToWatchlist).toHaveBeenCalledWith(TITLE_ID, "user-1");
    });

    it("should pass the viewer to removeFromWatchlist", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer()).delete(`/title/${TITLE_ID}/watchlist`).expect(200);

      expect(titleService.removeFromWatchlist).toHaveBeenCalledWith(TITLE_ID, "user-1");
    });

    // The one that matters most: `userId: undefined` in a Prisma `where` reads as
    // "no filter", so a withdrawal with no viewer would delete everyone's row.
    it("should fail loudly instead of deleting without a viewer filter", async () => {
      viewerId = undefined;

      await request(app.getHttpServer()).delete(`/title/${TITLE_ID}/watchlist`).expect(500);

      expect(titleService.removeFromWatchlist).not.toHaveBeenCalled();
    });

    it("should refuse to withdraw a score without a viewer", async () => {
      viewerId = undefined;

      await request(app.getHttpServer()).delete(`/title/${TITLE_ID}/rating`).expect(500);

      expect(titleService.removeRating).not.toHaveBeenCalled();
    });
  });
});
