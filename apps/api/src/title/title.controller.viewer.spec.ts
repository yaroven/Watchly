import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { TitleController } from "./title.controller";
import { TitleService } from "./title.service";

/**
 * Through the HTTP layer rather than by calling the handler: Nest does not run a
 * param decorator on a direct method call, so a unit spec cannot tell
 * `@OptionalUserId()` from a hardcoded `undefined` — and that difference is every
 * signed-in viewer reading as anonymous.
 */
describe("TitleController (viewer propagation)", () => {
  let app: INestApplication;
  let titleService: { findOne: jest.Mock; findAll: jest.Mock };
  let viewerId: string | undefined;

  beforeEach(async () => {
    titleService = {
      findOne: jest.fn().mockResolvedValue({ id: "title-1" }),
      findAll: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
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
});
