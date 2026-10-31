import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { UserService } from "../../../services/user/user.service";
import { UserExistsPipe } from "../../../services/user/utils/user-exists.pipe";
import { UsersController } from "./users.controller";

describe("UsersController (existence pipe)", () => {
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
      controllers: [UsersController],
      providers: [
        UserExistsPipe,
        { provide: UserService, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            user: {
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

  it("should answer 404 for a user that does not exist, without changing a role", async () => {
    exists = false;

    await request(app.getHttpServer())
      .patch(`/users/${ID}/role`)
      .send({ role: "ADMIN" })
      .expect(404);

    expect(service.update).not.toHaveBeenCalled();
  });
});
