import { VideoType } from "../../video-transcoder/enums/video-type.enum";
import {
  buildSeasonVideoPrefix,
  buildVideoManifestKey,
  buildVideoPrefix,
  VideoLocation,
  videoPath,
} from "./processed-key";

const MOVIE: VideoLocation = { type: VideoType.MOVIE, titleId: "title-1" };
const EPISODE: VideoLocation = {
  type: VideoType.EPISODE,
  titleId: "title-1",
  seasonId: "season-1",
  episodeId: "episode-1",
};

describe("processed key", () => {
  describe("buildVideoPrefix", () => {
    it("addresses a movie by its title id", () => {
      expect(buildVideoPrefix(MOVIE)).toBe("videos/title-1/");
    });

    it("nests an episode under its title and season", () => {
      expect(buildVideoPrefix(EPISODE)).toBe("videos/title-1/season-1/episode-1/");
    });

    // deleteFolder matches on the prefix, so a missing slash would also sweep
    // "videos/title-10/" when deleting "videos/title-1".
    it.each([MOVIE, EPISODE])("ends in a slash, because it names a folder", (location) => {
      expect(buildVideoPrefix(location).endsWith("/")).toBe(true);
    });
  });

  describe("buildVideoManifestKey", () => {
    it("is the prefix plus the manifest", () => {
      expect(buildVideoManifestKey(MOVIE)).toBe("videos/title-1/master.m3u8");
      expect(buildVideoManifestKey(EPISODE)).toBe("videos/title-1/season-1/episode-1/master.m3u8");
    });

    it("sits under the prefix the cleanup path deletes", () => {
      expect(buildVideoManifestKey(EPISODE).startsWith(buildVideoPrefix(EPISODE))).toBe(true);
    });
  });

  describe("buildSeasonVideoPrefix", () => {
    it("covers every episode of that season", () => {
      expect(
        buildVideoPrefix(EPISODE).startsWith(buildSeasonVideoPrefix("title-1", "season-1")),
      ).toBe(true);
    });

    it("does not reach a different season", () => {
      expect(
        buildVideoPrefix(EPISODE).startsWith(buildSeasonVideoPrefix("title-1", "season-2")),
      ).toBe(false);
    });
  });

  /**
   * The worker composes keys per output file from `videoPath` while playback reads
   * `buildVideoManifestKey`. The two were separate string literals in separate
   * files; a drift between them writes the output somewhere nothing looks.
   */
  describe("videoPath agrees with the prefix the reader uses", () => {
    it.each([MOVIE, EPISODE])("for %p", (location) => {
      expect(`videos/${videoPath(location)}/`).toBe(buildVideoPrefix(location));
    });
  });
});
