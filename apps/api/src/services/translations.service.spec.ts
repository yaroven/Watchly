import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EpisodeService } from "./episode/episode.service";
import { GenreService } from "./genre/genre.service";
import { ImageService } from "./image/image.service";
import { MediaAssetService } from "./media-asset/media-asset.service";
import { PrismaService } from "./prisma/prisma.service";
import { SeasonService } from "./season/season.service";
import { TitleService } from "./title/title.service";

type Row = Record<string, unknown> & { locale: string };

function translationTable(key: string) {
  const rows = new Map<string, Row>();
  const id = (entityId: unknown, locale: unknown) => `${String(entityId)}:${String(locale)}`;
  const pick = (row: Row, select?: Record<string, boolean>) =>
    select ? Object.fromEntries(Object.keys(select).map((field) => [field, row[field]])) : row;

  return {
    rows,
    findMany: jest.fn(async ({ where, select }) =>
      [...rows.values()].filter((row) => row[key] === where[key]).map((row) => pick(row, select)),
    ),
    upsert: jest.fn(async ({ where, create, update, select }) => {
      const compound = Object.values(where)[0] as Record<string, unknown>;
      const rowId = id(compound[key], compound.locale);
      const existing = rows.get(rowId);
      const row = (existing ? { ...existing, ...update } : { ...create }) as Row;
      rows.set(rowId, row);
      return pick(row, select);
    }),
    deleteMany: jest.fn(async ({ where }) => {
      let count = 0;
      for (const [rowId, row] of rows) {
        if (row[key] === where[key] && row.locale === where.locale) {
          rows.delete(rowId);
          count += 1;
        }
      }
      return { count };
    }),
  };
}

type Entity = {
  name: string;
  key: string;
  delegate: string;
  table: string;
  english: Record<string, unknown>;
  ukrainian: Record<string, string>;
  build: (prisma: PrismaService) => {
    upsertTranslation: (id: string, locale: "uk", data: never) => Promise<unknown>;
    removeTranslation: (id: string, locale: "uk") => Promise<void>;
    listTranslations: (id: string) => Promise<unknown[]>;
    findOne: (id: string, locale: "uk") => Promise<{ name: string; content: unknown } | null>;
  };
};

const imageService = { toPublicUrl: () => null } as unknown as ImageService;
const mediaAssetService = {} as MediaAssetService;

const entities: Entity[] = [
  {
    name: "title",
    key: "titleId",
    delegate: "title",
    table: "titleTranslation",
    english: { id: "e-1", name: "Spirited Away", description: "A girl.", genres: [] },
    ukrainian: { name: "Віднесені привидами", description: "Дівчинка." },
    build: (prisma) => new TitleService(prisma, imageService, mediaAssetService) as never,
  },
  {
    name: "season",
    key: "seasonId",
    delegate: "season",
    table: "seasonTranslation",
    english: { id: "e-1", name: "Season one", description: "It starts." },
    ukrainian: { name: "Сезон перший", description: "Початок." },
    build: (prisma) => new SeasonService(prisma, imageService, mediaAssetService) as never,
  },
  {
    name: "episode",
    key: "episodeId",
    delegate: "episode",
    table: "episodeTranslation",
    english: { id: "e-1", name: "Pilot", description: "It starts." },
    ukrainian: { name: "Пілот", description: "Початок." },
    build: (prisma) => new EpisodeService(prisma, mediaAssetService) as never,
  },
  {
    name: "genre",
    key: "genreId",
    delegate: "genre",
    table: "genreTranslation",
    english: { id: "e-1", name: "Drama" },
    ukrainian: { name: "Драма" },
    build: (prisma) => new GenreService(prisma) as never,
  },
];

describe.each(entities)("$name translations", (entity) => {
  let table: ReturnType<typeof translationTable>;
  let service: ReturnType<Entity["build"]>;

  beforeEach(() => {
    table = translationTable(entity.key);
    const prisma = {
      [entity.table]: table,
      [entity.delegate]: {
        findUnique: jest.fn(async ({ include }) => ({
          ...entity.english,
          translations: include?.translations
            ? [...table.rows.values()].filter(
                (row) => row.locale === include.translations.where.locale,
              )
            : undefined,
        })),
      },
    } as unknown as PrismaService;
    service = entity.build(prisma);
  });

  it("should keep one translation per locale, holding the latest text", async () => {
    await service.upsertTranslation("e-1", "uk", entity.ukrainian as never);
    const second = { ...entity.ukrainian, name: `${entity.ukrainian.name} (2)` };
    await service.upsertTranslation("e-1", "uk", second as never);

    expect(await service.listTranslations("e-1")).toEqual([{ locale: "uk", ...second }]);
  });

  it("should serve the translation on a uk read once it is saved", async () => {
    await service.upsertTranslation("e-1", "uk", entity.ukrainian as never);

    const view = await service.findOne("e-1", "uk");

    expect(view).toMatchObject({
      name: entity.ukrainian.name,
      content: { locale: "uk", fallback: false },
    });
  });

  it("should fall back to English on a uk read after the translation is deleted", async () => {
    await service.upsertTranslation("e-1", "uk", entity.ukrainian as never);
    await service.removeTranslation("e-1", "uk");

    const view = await service.findOne("e-1", "uk");

    expect(view).toMatchObject({
      name: entity.english.name,
      content: { locale: "en", fallback: true },
    });
  });

  it("should succeed when deleting a translation that does not exist", async () => {
    await expect(service.removeTranslation("e-1", "uk")).resolves.toBeUndefined();
  });

  it("should answer 404 when the entity disappears before the write lands", async () => {
    table.upsert.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "test" }),
    );

    await expect(service.upsertTranslation("e-1", "uk", entity.ukrainian as never)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("genre translations", () => {
  it("should refuse a Ukrainian name another genre already uses in Ukrainian", async () => {
    const table = translationTable("genreId");
    table.upsert.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique", { code: "P2002", clientVersion: "test" }),
    );
    const service = new GenreService({ genreTranslation: table } as unknown as PrismaService);

    await expect(service.upsertTranslation("genre-2", "uk", { name: "Драма" })).rejects.toThrow(
      BadRequestException,
    );
  });
});
