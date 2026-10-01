import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TitleService } from "./title.service";
import { WatchlistController } from "./watchlist.controller";

/** The cross-tenant read: an unset viewer here would list everyone's watchlist rows. */
describe("WatchlistController (viewer propagation)", () => {
  let app: INestApplication;
  let titleService: { findWatchlist: jest.Mock };
  let viewerId: string | undefined;

  beforeEach(async () => {
    titleService = { findWatchlist: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [{ provide: TitleService, useValue: titleService }],
    })
      .overrideGuard(JwtAuthGuard)
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

  it("should scope the list to the signed-in viewer", async () => {
    viewerId = "user-1";

    await request(app.getHttpServer()).get("/watchlist").expect(200);

    expect(titleService.findWatchlist).toHaveBeenCalledWith("user-1", expect.anything());
  });

  it("should refuse rather than listing without a viewer filter", async () => {
    viewerId = undefined;

    await request(app.getHttpServer()).get("/watchlist").expect(500);

    expect(titleService.findWatchlist).not.toHaveBeenCalled();
  });
});
