import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { TitleExistsPipe } from "../title/utils/title-exists.pipe";
import { TitleWatchlistController } from "./title-watchlist.controller";
import { WatchlistService } from "./watchlist.service";

/**
 * Through the HTTP layer rather than by calling the handler: Nest does not run a
 * param decorator on a direct method call, so a unit spec cannot tell
 * `@CurrentUserId()` from a hardcoded value — and that difference is a
 * withdrawal running with no viewer filter.
 *
 * These cases came over from `title.controller.viewer.spec.ts` with the routes.
 */
describe("TitleWatchlistController (viewer propagation)", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let watchlistService: { add: jest.Mock; remove: jest.Mock };
  let viewerId: string | undefined;

  beforeEach(async () => {
    watchlistService = {
      add: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitleWatchlistController],
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

  it("should pass the viewer through when putting a title on the list", async () => {
    viewerId = "user-1";

    await request(app.getHttpServer()).post(`/titles/${TITLE_ID}/watchlist`).expect(200);

    expect(watchlistService.add).toHaveBeenCalledWith(TITLE_ID, "user-1");
  });

  it("should pass the viewer through when taking a title off the list", async () => {
    viewerId = "user-1";

    await request(app.getHttpServer()).delete(`/titles/${TITLE_ID}/watchlist`).expect(200);

    expect(watchlistService.remove).toHaveBeenCalledWith(TITLE_ID, "user-1");
  });

  // The one that matters most: `userId: undefined` in a Prisma `where` reads as
  // "no filter", so a withdrawal with no viewer would delete everyone's row.
  it("should fail loudly instead of deleting without a viewer filter", async () => {
    viewerId = undefined;

    await request(app.getHttpServer()).delete(`/titles/${TITLE_ID}/watchlist`).expect(500);

    expect(watchlistService.remove).not.toHaveBeenCalled();
  });
});
