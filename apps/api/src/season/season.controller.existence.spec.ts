import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { SeasonController } from "./season.controller";
import { SeasonService } from "./season.service";
import { SeasonExistsPipe } from "./utils/season-exists.pipe";

describe("SeasonController (existence pipe)", () => {
  const ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let service: Record<string, jest.Mock>;
  let exists: boolean;

  beforeEach(async () => {
    exists = true;
    service = {
      update: jest.fn().mockResolvedValue({ id: ID }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SeasonController],
      providers: [
        SeasonExistsPipe,
        { provide: SeasonService, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            season: {
              findUnique: jest.fn(() => Promise.resolve(exists ? { id: ID } : null)),
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (_: ExecutionContext) => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: (_: ExecutionContext) => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it("should forward an update for a season that exists", async () => {
    await request(app.getHttpServer())
      .patch(`/seasons/${ID}`)
      .send({ name: "New name" })
      .expect(200);

    expect(service.update).toHaveBeenCalledWith(ID, { name: "New name" });
  });

  it("should answer 404 for a season that does not exist, without updating", async () => {
    exists = false;

    await request(app.getHttpServer())
      .patch(`/seasons/${ID}`)
      .send({ name: "New name" })
      .expect(404);

    expect(service.update).not.toHaveBeenCalled();
  });
});
