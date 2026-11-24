import { ExecutionContext, INestApplication, Type, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { RolesGuard } from "../../guards/roles.guard";
import { EpisodeExistsPipe } from "../../services/episode/utils/episode-exists.pipe";
import { GenreService } from "../../services/genre/genre.service";
import { GenreExistsPipe } from "../../services/genre/utils/genre-exists.pipe";
import { PrismaService } from "../../services/prisma/prisma.service";
import { SeasonService } from "../../services/season/season.service";
import { SeasonExistsPipe } from "../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../services/title/utils/title-exists.pipe";
import { EpisodesController } from "./episodes/episodes.controller";
import { EpisodesService } from "./episodes/episodes.service";
import { GenresController } from "./genres/genres.controller";
import { SeasonsController } from "./seasons/seasons.controller";
import { TitlesController } from "./titles/titles.controller";
import { TitlesService } from "./titles/titles.service";

const ID = "11111111-1111-4111-8111-111111111111";

type Case = {
  name: string;
  path: string;
  controller: Type<unknown>;
  service: Type<unknown>;
  pipe: Type<unknown>;
  delegate: string;
  body: Record<string, string>;
  incomplete: Record<string, string>;
};

const nameDescription = { name: "Назва", description: "Опис" };

const cases: Case[] = [
  {
    name: "titles",
    path: "titles",
    controller: TitlesController,
    service: TitlesService,
    pipe: TitleExistsPipe,
    delegate: "title",
    body: nameDescription,
    incomplete: { name: "Назва" },
  },
  {
    name: "seasons",
    path: "seasons",
    controller: SeasonsController,
    service: SeasonService,
    pipe: SeasonExistsPipe,
    delegate: "season",
    body: nameDescription,
    incomplete: { name: "Назва" },
  },
  {
    name: "episodes",
    path: "episodes",
    controller: EpisodesController,
    service: EpisodesService,
    pipe: EpisodeExistsPipe,
    delegate: "episode",
    body: nameDescription,
    incomplete: { name: "Назва" },
  },
  {
    name: "genres",
    path: "genres",
    controller: GenresController,
    service: GenreService,
    pipe: GenreExistsPipe,
    delegate: "genre",
    body: { name: "Драма" },
    incomplete: {},
  },
];

describe.each(cases)("$name translation routes", (testCase) => {
  let app: INestApplication;
  let exists: boolean;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    exists = true;
    service = {
      listTranslations: jest.fn().mockResolvedValue([]),
      upsertTranslation: jest.fn(async (_id, locale, data) => ({ locale, ...data })),
      removeTranslation: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [testCase.controller],
      providers: [
        testCase.pipe,
        { provide: testCase.service, useValue: service },
        {
          provide: PrismaService,
          useValue: {
            [testCase.delegate]: {
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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const url = (locale = "uk") => `/${testCase.path}/${ID}/translations/${locale}`;

  it("should save a complete translation for an entity that exists", async () => {
    const response = await request(app.getHttpServer()).put(url()).send(testCase.body).expect(200);

    expect(service.upsertTranslation).toHaveBeenCalledWith(ID, "uk", testCase.body);
    expect(response.body).toEqual({ locale: "uk", ...testCase.body });
  });

  it("should answer 404 for an entity that does not exist, without writing", async () => {
    exists = false;

    await request(app.getHttpServer()).put(url()).send(testCase.body).expect(404);

    expect(service.upsertTranslation).not.toHaveBeenCalled();
  });

  it("should answer 400 for English, which is edited on the entity itself", async () => {
    await request(app.getHttpServer()).put(url("en")).send(testCase.body).expect(400);

    expect(service.upsertTranslation).not.toHaveBeenCalled();
  });

  it("should answer 400 for an unsupported locale", async () => {
    await request(app.getHttpServer()).put(url("de")).send(testCase.body).expect(400);
  });

  it("should answer 400 for an incomplete translation", async () => {
    await request(app.getHttpServer()).put(url()).send(testCase.incomplete).expect(400);

    expect(service.upsertTranslation).not.toHaveBeenCalled();
  });

  it("should delete with 204", async () => {
    await request(app.getHttpServer()).delete(url()).expect(204);

    expect(service.removeTranslation).toHaveBeenCalledWith(ID, "uk");
  });

  it("should list translations", async () => {
    await request(app.getHttpServer()).get(`/${testCase.path}/${ID}/translations`).expect(200);

    expect(service.listTranslations).toHaveBeenCalledWith(ID);
  });
});
