import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { ArtistService } from "../../../services/artist/artist.service";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { ArtistsController } from "./artists.controller";

describe("ArtistsController (existence pipe)", () => {
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
      controllers: [ArtistsController],
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
