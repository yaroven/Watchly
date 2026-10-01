import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { TitleEngagementController } from "./title-engagement.controller";
import { TitleEngagementService } from "./title-engagement.service";

/**
 * Through HTTP, not by calling handlers: Nest does not run a param decorator on a
 * direct method call, so a unit spec cannot tell `@CurrentUserId()` from a hardcoded
 * value — and an unset viewer reaching a Prisma `where` means "no filter" there.
 */
describe("TitleEngagementController (viewer propagation)", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  let app: INestApplication;
  let engagement: Record<string, jest.Mock>;
  let viewerId: string | undefined;

  beforeEach(async () => {
    engagement = {
      summarize: jest.fn().mockResolvedValue({}),
      react: jest.fn().mockResolvedValue({}),
      removeReaction: jest.fn().mockResolvedValue({}),
      addToWatchlist: jest.fn().mockResolvedValue({}),
      removeFromWatchlist: jest.fn().mockResolvedValue({}),
    };

    const attachViewer = {
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest<{ userId?: string }>().userId = viewerId;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitleEngagementController],
      providers: [{ provide: TitleEngagementService, useValue: engagement }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(attachViewer)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(attachViewer)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe("the write routes", () => {
    beforeEach(() => {
      viewerId = "user-1";
    });

    it("should pass the viewer to react", async () => {
      await request(app.getHttpServer())
        .post(`/title/${titleId}/reaction`)
        .send({ type: ReactionType.LIKE })
        .expect(200);

      expect(engagement.react).toHaveBeenCalledWith(titleId, "user-1", ReactionType.LIKE);
    });

    it("should pass the viewer to removeReaction", async () => {
      await request(app.getHttpServer()).delete(`/title/${titleId}/reaction`).expect(200);

      expect(engagement.removeReaction).toHaveBeenCalledWith(titleId, "user-1");
    });

    it("should pass the viewer to addToWatchlist", async () => {
      await request(app.getHttpServer()).post(`/title/${titleId}/watchlist`).expect(200);

      expect(engagement.addToWatchlist).toHaveBeenCalledWith(titleId, "user-1");
    });

    it("should pass the viewer to removeFromWatchlist", async () => {
      await request(app.getHttpServer()).delete(`/title/${titleId}/watchlist`).expect(200);

      expect(engagement.removeFromWatchlist).toHaveBeenCalledWith(titleId, "user-1");
    });
  });

  describe("the write routes, with the guard somehow not having set a viewer", () => {
    beforeEach(() => {
      viewerId = undefined;
    });

    // `@CurrentUserId()` refuses rather than handing `undefined` on to a `where`.
    it("should fail loudly instead of deleting without a viewer filter", async () => {
      await request(app.getHttpServer()).delete(`/title/${titleId}/watchlist`).expect(500);

      expect(engagement.removeFromWatchlist).not.toHaveBeenCalled();
    });
  });

  describe("the public read", () => {
    it("should pass the viewer when there is one", async () => {
      viewerId = "user-1";

      await request(app.getHttpServer()).get(`/title/${titleId}/engagement`).expect(200);

      expect(engagement.summarize).toHaveBeenCalledWith(titleId, "user-1");
    });

    // @OptionalUserId, not @CurrentUserId: the latter would 500 every anonymous caller.
    it("should answer anonymously rather than failing when there is none", async () => {
      viewerId = undefined;

      await request(app.getHttpServer()).get(`/title/${titleId}/engagement`).expect(200);

      expect(engagement.summarize).toHaveBeenCalledWith(titleId, null);
    });
  });
});
