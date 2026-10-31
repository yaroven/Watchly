import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { OptionalJwtAuthGuard } from "../../../guards/optional-jwt-auth.guard";
import { FeatureFlagService } from "../../../services/feature-flag/feature-flag.service";
import { FeatureFlagsController } from "./feature-flags.controller";

describe("FeatureFlagsController", () => {
  const VIEWER_ID = "22222222-2222-4222-8222-222222222222";

  let app: INestApplication;
  let featureFlags: { snapshotFor: jest.Mock };
  let viewerId: string | undefined;

  beforeEach(async () => {
    viewerId = undefined;
    featureFlags = { snapshotFor: jest.fn().mockResolvedValue({ reactions: true }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [{ provide: FeatureFlagService, useValue: featureFlags }],
    })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          if (viewerId) context.switchToHttp().getRequest().userId = viewerId;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should answer anonymous callers with the global values", async () => {
    const response = await request(app.getHttpServer()).get("/feature-flags").expect(200);

    expect(response.body).toEqual({ reactions: true });
    expect(featureFlags.snapshotFor).toHaveBeenCalledWith({});
  });

  it("should resolve for the signed-in viewer", async () => {
    viewerId = VIEWER_ID;

    await request(app.getHttpServer()).get("/feature-flags").expect(200);

    expect(featureFlags.snapshotFor).toHaveBeenCalledWith({ targetingKey: VIEWER_ID });
  });
});
