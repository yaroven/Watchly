import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { TitleRatingController } from "./title-rating.controller";
import { TitleRatingService } from "./title-rating.service";

describe("TitleRatingController (viewer propagation)", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  let app: INestApplication;
  let rating: Record<string, jest.Mock>;
  let viewerId: string | undefined;

  beforeEach(async () => {
    rating = {
      summarize: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
    };

    const attachViewer = {
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest<{ userId?: string }>().userId = viewerId;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitleRatingController],
      providers: [{ provide: TitleRatingService, useValue: rating }],
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

  it("should pass the viewer when setting a score", async () => {
    viewerId = "user-1";

    await request(app.getHttpServer())
      .put(`/title/${titleId}/rating`)
      .send({ score: 7 })
      .expect(200);

    expect(rating.set).toHaveBeenCalledWith(titleId, "user-1", 7);
  });

  // Prisma reads a missing `userId` in a `where` as "no filter", so this delete
  // would otherwise remove every user's rating for the title.
  it("should refuse to withdraw a score without a viewer", async () => {
    viewerId = undefined;

    await request(app.getHttpServer()).delete(`/title/${titleId}/rating`).expect(500);

    expect(rating.remove).not.toHaveBeenCalled();
  });

  it("should let an anonymous caller read the summary", async () => {
    viewerId = undefined;

    await request(app.getHttpServer()).get(`/title/${titleId}/rating`).expect(200);

    // `null`, matching the engagement controller: "no viewer" is stated, not defaulted.
    expect(rating.summarize).toHaveBeenCalledWith(titleId, null);
  });
});
