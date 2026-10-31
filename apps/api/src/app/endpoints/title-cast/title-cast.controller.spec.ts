import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { RolesGuard } from "../../../guards/roles.guard";
import { PrismaService } from "../../../services/prisma/prisma.service";
import { TitleCastService } from "../../../services/title-cast/title-cast.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { TitleCastController } from "./title-cast.controller";

describe("TitleCastController", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";

  let app: INestApplication;
  let titleCastService: { findForTitle: jest.Mock; replaceForTitle: jest.Mock };
  let titleExists: boolean;

  beforeEach(async () => {
    titleExists = true;
    titleCastService = {
      findForTitle: jest.fn().mockResolvedValue([]),
      replaceForTitle: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TitleCastController],
      providers: [
        TitleExistsPipe,
        { provide: TitleCastService, useValue: titleCastService },
        {
          provide: PrismaService,
          useValue: {
            title: {
              findUnique: jest.fn(() => Promise.resolve(titleExists ? { id: TITLE_ID } : null)),
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

  describe("findForTitle", () => {
    it("should forward the title id", async () => {
      await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/cast`).expect(200);

      expect(titleCastService.findForTitle).toHaveBeenCalledWith(TITLE_ID);
    });

    it("should answer 404 for a title that does not exist, without reading the cast", async () => {
      titleExists = false;

      await request(app.getHttpServer()).get(`/titles/${TITLE_ID}/cast`).expect(404);

      expect(titleCastService.findForTitle).not.toHaveBeenCalled();
    });
  });

  describe("replaceForTitle", () => {
    it("should forward the credits", async () => {
      const credits = [{ artistId: "33333333-3333-4333-8333-333333333333", character: "Neo" }];

      await request(app.getHttpServer())
        .put(`/titles/${TITLE_ID}/cast`)
        .send({ credits })
        .expect(200);

      expect(titleCastService.replaceForTitle).toHaveBeenCalledWith(TITLE_ID, credits);
    });

    it("should answer 404 for a title that does not exist, without writing", async () => {
      titleExists = false;

      await request(app.getHttpServer())
        .put(`/titles/${TITLE_ID}/cast`)
        .send({ credits: [] })
        .expect(404);

      expect(titleCastService.replaceForTitle).not.toHaveBeenCalled();
    });
  });
});
