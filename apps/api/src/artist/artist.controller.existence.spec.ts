import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { ArtistController } from "./artist.controller";
import { ArtistService } from "./artist.service";
import { ArtistExistsPipe } from "./utils/artist-exists.pipe";

describe("ArtistController (existence pipe)", () => {
  const ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let service: Record<string, jest.Mock>;
  let exists: boolean;

  beforeEach(async () => {
    exists = true;
    service = {
      update: jest.fn().mockResolvedValue({ id: ID }),
      delete: jest.fn().mockResolvedValue({ id: ID }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ArtistController],
      providers: [
        ArtistExistsPipe,
        { provide: ArtistService, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            artist: {
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

  it("should answer 404 for an artist that does not exist, without updating", async () => {
    exists = false;

    await request(app.getHttpServer()).patch(`/artists/${ID}`).send({ name: "Keanu" }).expect(404);

    expect(service.update).not.toHaveBeenCalled();
  });

  it("should answer 404 for an artist that does not exist, without deleting", async () => {
    exists = false;

    await request(app.getHttpServer()).delete(`/artists/${ID}`).expect(404);

    expect(service.delete).not.toHaveBeenCalled();
  });
});
