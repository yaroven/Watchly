import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WatchlistController } from "./watchlist.controller";
import { WatchlistService } from "./watchlist.service";

/** The cross-tenant read: an unset viewer here would list everyone's watchlist rows. */
describe("WatchlistController (viewer propagation)", () => {
  let app: INestApplication;
  let watchlistService: { findAll: jest.Mock };
  let viewerId: string | undefined;

  beforeEach(async () => {
    watchlistService = { findAll: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [{ provide: WatchlistService, useValue: watchlistService }],
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

    expect(watchlistService.findAll).toHaveBeenCalledWith("user-1", expect.anything());
  });

  it("should refuse rather than listing without a viewer filter", async () => {
    viewerId = undefined;

    await request(app.getHttpServer()).get("/watchlist").expect(500);

    expect(watchlistService.findAll).not.toHaveBeenCalled();
  });
});
