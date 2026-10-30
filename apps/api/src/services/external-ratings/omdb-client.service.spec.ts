import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { register } from "prom-client";
import { OmdbClient } from "./omdb-client.service";

const config = { apiKey: "key-1", baseUrl: "https://omdb.test/" };

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: () => Promise.resolve(body),
});

const status = (code: number) => ({
  ok: false,
  status: code,
  statusText: `status ${code}`,
  json: () => Promise.resolve({}),
});

describe("OmdbClient", () => {
  let client: OmdbClient;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    register.resetMetrics();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      providers: [OmdbClient, { provide: ConfigService, useValue: { getOrThrow: () => config } }],
    }).compile();

    client = moduleRef.get(OmdbClient);
  });

  afterEach(() => jest.clearAllMocks());

  const urlOf = (call: number) => (fetchMock.mock.calls[call][0] as URL).toString();

  describe("the request it builds", () => {
    it("asks by imdb id and carries the api key", async () => {
      fetchMock.mockResolvedValue(ok({ Response: "True" }));

      await client.fetchByImdbId("tt0111161");

      expect(urlOf(0)).toBe("https://omdb.test/?i=tt0111161&apikey=key-1");
    });

    it("asks by name and year when there is no id yet", async () => {
      fetchMock.mockResolvedValue(ok({ Response: "True" }));

      await client.fetchByNameYear("The Thing", 1982);

      expect(urlOf(0)).toContain("t=The+Thing");
      expect(urlOf(0)).toContain("y=1982");
    });

    it("carries a timeout signal", async () => {
      fetchMock.mockResolvedValue(ok({ Response: "True" }));

      await client.fetchByImdbId("tt1");

      const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("what it answers", () => {
    it("hands back the payload on a match", async () => {
      fetchMock.mockResolvedValue(ok({ Response: "True", imdbID: "tt1", imdbVotes: "1,000" }));

      await expect(client.fetchByImdbId("tt1")).resolves.toMatchObject({ imdbID: "tt1" });
    });

    it("answers nothing when OMDb reports no match", async () => {
      fetchMock.mockResolvedValue(ok({ Response: "False", Error: "Movie not found!" }));

      await expect(client.fetchByImdbId("tt1")).resolves.toBeUndefined();
    });
  });

  describe("retrying", () => {
    it("does not retry a definitive no-match", async () => {
      fetchMock.mockResolvedValue(ok({ Response: "False", Error: "Movie not found!" }));

      await client.fetchByImdbId("tt1");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does not retry a 4xx that is not a rate limit", async () => {
      fetchMock.mockResolvedValue(status(401));

      await expect(client.fetchByImdbId("tt1")).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("retries a 503 and keeps the answer that follows", async () => {
      fetchMock
        .mockResolvedValueOnce(status(503))
        .mockResolvedValueOnce(ok({ Response: "True", imdbID: "tt1" }));

      await expect(client.fetchByImdbId("tt1")).resolves.toMatchObject({ imdbID: "tt1" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("gives up after three attempts", async () => {
      fetchMock.mockResolvedValue(status(500));

      await expect(client.fetchByImdbId("tt1")).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("a hang", () => {
    const timeout = () => Object.assign(new Error("aborted"), { name: "TimeoutError" });

    it("is retried and then given up on, rather than held forever", async () => {
      fetchMock.mockRejectedValue(timeout());

      await expect(client.fetchByImdbId("tt1")).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("records a timeout outcome, which is what makes a hang visible", async () => {
      fetchMock.mockRejectedValue(timeout());

      await client.fetchByImdbId("tt1");

      expect(await register.metrics()).toContain(
        'omdb_request_duration_seconds_count{outcome="timeout"} 3',
      );
    });

    it("leaves nothing in flight afterwards", async () => {
      fetchMock.mockRejectedValue(timeout());

      await client.fetchByImdbId("tt1");

      expect(await register.metrics()).toContain("omdb_requests_in_flight 0");
    });
  });
});
