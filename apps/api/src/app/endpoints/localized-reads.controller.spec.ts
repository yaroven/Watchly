import { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { RolesGuard } from "../../guards/roles.guard";
import { EpisodeService } from "../../services/episode/episode.service";
import { GenreService } from "../../services/genre/genre.service";
import { MediaAssetService } from "../../services/media-asset/media-asset.service";
import { PrismaService } from "../../services/prisma/prisma.service";
import { SeasonService } from "../../services/season/season.service";
import { EpisodesController } from "./episodes/episodes.controller";
import { EpisodesService } from "./episodes/episodes.service";
import { GenresController } from "./genres/genres.controller";
import { SeasonsController } from "./seasons/seasons.controller";

const ID = "11111111-1111-4111-8111-111111111111";

type Case = {
  name: string;
  controller: Type<unknown>;
  providers: (findOne: jest.Mock) => { provide: unknown; useValue: unknown }[];
  path: string;
};

const cases: Case[] = [
  {
    name: "GET /genres/:id",
    controller: GenresController,
    providers: (findOne) => [{ provide: GenreService, useValue: { findOne } }],
    path: `/genres/${ID}`,
  },
  {
    name: "GET /seasons/:id",
    controller: SeasonsController,
    providers: (findOne) => [{ provide: SeasonService, useValue: { findOne } }],
    path: `/seasons/${ID}`,
  },
  {
    name: "GET /episodes/:id",
    controller: EpisodesController,
    providers: (findOne) => [
      {
        provide: EpisodesService,
        useFactory: () =>
          new EpisodesService({ findOne } as unknown as EpisodeService, {} as MediaAssetService),
      } as never,
    ],
    path: `/episodes/${ID}`,
  },
];

describe.each(cases)("$name (localized read)", ({ controller, providers, path }) => {
  let app: INestApplication;
  let findOne: jest.Mock;

  beforeEach(async () => {
    findOne = jest.fn().mockResolvedValue({ id: ID });
    const moduleRef = await Test.createTestingModule({
      controllers: [controller],
      providers: [...providers(findOne), { provide: PrismaService, useValue: {} }] as never,
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
  });

  it("should hand the service the locale from Accept-Language and mark the response as varying by it", async () => {
    const response = await request(app.getHttpServer())
      .get(path)
      .set("Accept-Language", "uk-UA,uk;q=0.9")
      .expect(200);

    expect(findOne).toHaveBeenCalledWith(ID, "uk");
    expect(response.headers.vary).toContain("Accept-Language");
  });

  it("should hand the service English when the request names no language", async () => {
    await request(app.getHttpServer()).get(path).expect(200);

    expect(findOne).toHaveBeenCalledWith(ID, "en");
  });
});
