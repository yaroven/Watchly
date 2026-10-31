import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { WatchlistService } from "../../../services/watchlist/watchlist.service";
import { WatchlistController } from "./watchlist.controller";

describe("WatchlistController (viewer propagation)", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let watchlistService: { findAll: jest.Mock; add: jest.Mock; remove: jest.Mock };
  let viewerId: string | undefined;

  beforeEach(async () => {
    watchlistService = {
      findAll: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      add: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        TitleExistsPipe,
        { provide: WatchlistService, useValue: watchlistService },
        {
          provide: PrismaService,
          useValue: { title: { findUnique: jest.fn().mockResolvedValue({ id: TITLE_ID }) } },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{
            userId?: string;
            viewerScope?: string;
          }>();
          req.userId = viewerId;
          req.viewerScope = "required";
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

  it("should pass the viewer through when putting a title on the list", async () => {
    viewerId = "user-1";

    await request(app.getHttpServer()).post(`/watchlist/${TITLE_ID}`).expect(200);

    expect(watchlistService.add).toHaveBeenCalledWith(TITLE_ID, "user-1");
  });

  it("should pass the viewer through when taking a title off the list", async () => {
    viewerId = "user-1";

    await request(app.getHttpServer()).delete(`/watchlist/${TITLE_ID}`).expect(200);

    expect(watchlistService.remove).toHaveBeenCalledWith(TITLE_ID, "user-1");
  });

  it("should fail loudly instead of deleting without a viewer filter", async () => {
    viewerId = undefined;

    await request(app.getHttpServer()).delete(`/watchlist/${TITLE_ID}`).expect(500);

    expect(watchlistService.remove).not.toHaveBeenCalled();
  });
});
