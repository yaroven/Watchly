import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { GenreService } from "../../../services/genre/genre.service";
import { GenreExistsPipe } from "../../../services/genre/utils/genre-exists.pipe";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { GenresController } from "./genres.controller";

describe("GenresController (existence pipe)", () => {
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
      controllers: [GenresController],
      providers: [
        GenreExistsPipe,
        { provide: GenreService, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            genre: {
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

  it("should forward an update for a genre that exists", async () => {
    await request(app.getHttpServer()).patch(`/genres/${ID}`).send({ name: "Drama" }).expect(200);

    expect(service.update).toHaveBeenCalledWith(ID, { name: "Drama" });
  });

  it("should answer 404 for a genre that does not exist, without updating", async () => {
    exists = false;

    await request(app.getHttpServer()).patch(`/genres/${ID}`).send({ name: "Drama" }).expect(404);

    expect(service.update).not.toHaveBeenCalled();
  });
});
