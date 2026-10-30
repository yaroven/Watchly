import { ImageKind } from "../queues/image-transcoder/image-profile.const";
import { PosterImageAttacher, posterImageAttachersProvider } from "./poster-image.attacher";
import { PosterService } from "./poster.service";

describe("PosterImageAttacher", () => {
  const posterService = {
    buildProcessedKey: jest.fn().mockReturnValue("posters/titles/id/v1.webp"),
    attachProcessed: jest.fn(),
  } as unknown as jest.Mocked<PosterService>;

  afterEach(() => jest.clearAllMocks());

  it("asks the service for the key of its own entity kind", () => {
    new PosterImageAttacher(posterService, "seasons").buildKey("season-1", "v1");

    expect(posterService.buildProcessedKey).toHaveBeenCalledWith("seasons", "season-1", "v1");
  });

  it("attaches through the service rather than writing the row itself", async () => {
    await new PosterImageAttacher(posterService, "artists").attach("artist-1", "key");

    expect(posterService.attachProcessed).toHaveBeenCalledWith("artists", "artist-1", "key");
  });

  describe("the provider the worker registers", () => {
    const attachers = (
      posterImageAttachersProvider as {
        useFactory: (service: PosterService) => PosterImageAttacher[];
      }
    ).useFactory(posterService);

    it("covers every image kind a poster upload can carry", () => {
      expect(attachers.map((attacher) => attacher.kind).sort()).toEqual(
        [ImageKind.ARTIST_PHOTO, ImageKind.SEASON_POSTER, ImageKind.TITLE_POSTER].sort(),
      );
    });

    it("registers each kind once", () => {
      const kinds = attachers.map((attacher) => attacher.kind);

      expect(new Set(kinds).size).toBe(kinds.length);
    });
  });
});
