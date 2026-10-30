jest.mock("@nestjs/schedule", () => ({ Cron: () => () => undefined }));

import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ExternalRatingSource } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ExternalRatingsService } from "./external-ratings.service";
import { OmdbClient, OmdbTitle } from "./omdb-client.service";

const rating = (Source: string, Value: string) => ({ Source, Value });

const titleRow = (id: string, externalId?: string) => ({
  id,
  name: `Title ${id}`,
  releaseDate: new Date("1999-03-31T00:00:00.000Z"),
  externalIds: externalId ? [{ externalId }] : [],
});

describe("ExternalRatingsService", () => {
  let service: ExternalRatingsService;
  let prisma: {
    title: { findMany: jest.Mock; findUnique: jest.Mock };
    titleExternalId: { upsert: jest.Mock };
    externalRatings: { upsert: jest.Mock; findMany: jest.Mock };
  };
  let omdb: { fetchByImdbId: jest.Mock; fetchByNameYear: jest.Mock };

  const answers = (data: OmdbTitle | undefined) => {
    omdb.fetchByImdbId.mockResolvedValue(data);
    omdb.fetchByNameYear.mockResolvedValue(data);
  };

  beforeEach(async () => {
    prisma = {
      title: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      titleExternalId: { upsert: jest.fn() },
      externalRatings: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    omdb = { fetchByImdbId: jest.fn(), fetchByNameYear: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExternalRatingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OmdbClient, useValue: omdb },
      ],
    }).compile();

    service = moduleRef.get(ExternalRatingsService);
  });

  afterEach(() => jest.clearAllMocks());

  const syncOne = async (externalId?: string) => {
    prisma.title.findUnique.mockResolvedValue(titleRow("t-1", externalId));
    await service.syncRatingsForTitle("t-1");
  };

  const writtenFor = (source: ExternalRatingSource) =>
    (prisma.externalRatings.upsert.mock.calls as [{ create: Record<string, unknown> }][]).find(
      ([call]) => call.create.source === source,
    )?.[0].create;

  describe("which source each OMDb name becomes", () => {
    beforeEach(() => {
      answers({
        Ratings: [
          rating("Internet Movie Database", "8.5/10"),
          rating("Rotten Tomatoes", "91%"),
          rating("Metacritic", "80/100"),
        ],
      });
    });

    it("writes one row per recognised source", async () => {
      await syncOne("tt1");

      expect(prisma.externalRatings.upsert).toHaveBeenCalledTimes(3);
      expect(writtenFor(ExternalRatingSource.IMDB)).toMatchObject({ rating: 8.5 });
      expect(writtenFor(ExternalRatingSource.ROTTEN_TOMATOES)).toMatchObject({ rating: 91 });
      expect(writtenFor(ExternalRatingSource.METACRITIC)).toMatchObject({ rating: 80 });
    });
  });

  describe("what it refuses to write", () => {
    it("skips a source it does not know", async () => {
      answers({ Ratings: [rating("Letterboxd", "4.5/5")] });

      await syncOne("tt1");

      expect(prisma.externalRatings.upsert).not.toHaveBeenCalled();
    });

    it("skips a value that is not a number", async () => {
      answers({ Ratings: [rating("Metacritic", "N/A")] });

      await syncOne("tt1");

      expect(prisma.externalRatings.upsert).not.toHaveBeenCalled();
    });
  });

  describe("vote counts", () => {
    it("parses the thousands separators, for IMDB only", async () => {
      answers({
        imdbVotes: "2,845,109",
        Ratings: [rating("Internet Movie Database", "9.3/10"), rating("Metacritic", "82/100")],
      });

      await syncOne("tt1");

      expect(writtenFor(ExternalRatingSource.IMDB)).toMatchObject({ votesCount: 2845109 });
      expect(writtenFor(ExternalRatingSource.METACRITIC)).toMatchObject({ votesCount: null });
    });

    it("answers null rather than NaN when OMDb has no number", async () => {
      answers({ imdbVotes: "N/A", Ratings: [rating("Internet Movie Database", "9.3/10")] });

      await syncOne("tt1");

      expect(writtenFor(ExternalRatingSource.IMDB)).toMatchObject({ votesCount: null });
    });
  });

  describe("how it asks", () => {
    it("asks by id when the title already has one", async () => {
      answers({ Ratings: [] });

      await syncOne("tt0111161");

      expect(omdb.fetchByImdbId).toHaveBeenCalledWith("tt0111161");
      expect(omdb.fetchByNameYear).not.toHaveBeenCalled();
    });

    it("asks by name and release year when it does not", async () => {
      answers({ Ratings: [] });

      await syncOne(undefined);

      expect(omdb.fetchByNameYear).toHaveBeenCalledWith("Title t-1", 1999);
      expect(omdb.fetchByImdbId).not.toHaveBeenCalled();
    });

    it("remembers the id it learned, so the next run asks by id", async () => {
      answers({ imdbID: "tt0111161", Ratings: [] });

      await syncOne(undefined);

      expect(prisma.titleExternalId.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            titleId: "t-1",
            source: ExternalRatingSource.IMDB,
            externalId: "tt0111161",
          },
        }),
      );
    });

    it("does not re-record an id it was given", async () => {
      answers({ imdbID: "tt0111161", Ratings: [] });

      await syncOne("tt0111161");

      expect(prisma.titleExternalId.upsert).not.toHaveBeenCalled();
    });

    it("refuses a title that does not exist", async () => {
      prisma.title.findUnique.mockResolvedValue(null);

      await expect(service.syncRatingsForTitle("gone")).rejects.toThrow(NotFoundException);
    });
  });

  describe("the nightly run", () => {
    const batchOf = (n: number, offset = 0) =>
      Array.from({ length: n }, (_, i) => titleRow(`t-${offset + i}`, "tt1"));

    it("walks the catalogue in pages rather than loading all of it", async () => {
      prisma.title.findMany
        .mockResolvedValueOnce(batchOf(200))
        .mockResolvedValueOnce(batchOf(3, 200));
      answers({ Ratings: [rating("Metacritic", "80/100")] });

      const result = await service.syncExternalRatings();

      expect(prisma.title.findMany).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({ total: 203, synced: 203 });
    });

    it("carries a cursor into the next page instead of a growing skip", async () => {
      prisma.title.findMany
        .mockResolvedValueOnce(batchOf(200))
        .mockResolvedValueOnce(batchOf(1, 200));
      answers({ Ratings: [] });

      await service.syncExternalRatings();

      const [, second] = prisma.title.findMany.mock.calls as [
        [Record<string, unknown>],
        [Record<string, unknown>],
      ];
      expect(second[0]).toMatchObject({ skip: 1, cursor: { id: "t-199" } });
    });

    it("stops after a short page without asking for another", async () => {
      prisma.title.findMany.mockResolvedValueOnce(batchOf(2));
      answers({ Ratings: [] });

      await service.syncExternalRatings();

      expect(prisma.title.findMany).toHaveBeenCalledTimes(1);
    });

    it("counts a title with no ratings written as unsynced", async () => {
      prisma.title.findMany.mockResolvedValueOnce(batchOf(2));
      answers(undefined);

      await expect(service.syncExternalRatings()).resolves.toMatchObject({
        total: 2,
        synced: 0,
      });
    });

    // One bad title must not end the night's run.
    it("keeps going when one title throws", async () => {
      prisma.title.findMany.mockResolvedValueOnce(batchOf(3));
      omdb.fetchByImdbId
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue({ Ratings: [rating("Metacritic", "80/100")] });

      await expect(service.syncExternalRatings()).resolves.toMatchObject({
        total: 3,
        synced: 2,
      });
    });
  });
});
