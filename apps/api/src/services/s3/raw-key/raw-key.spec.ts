import { ImageKind } from "../../queues/image-transcoder/image-profile.const";
import { VideoType } from "../../queues/video-transcoder/enums/video-type.enum";
import {
  buildRawKey,
  buildVideoRawKey,
  imageKindOf,
  isLegacyBareUuidKey,
  parseRawKey,
  RawObjectKind,
  videoKind,
  videoTypeOf,
} from "./raw-key";

const OWNER = "773bca63-f8ca-439f-ab2f-d28c333afa13";

describe("raw key", () => {
  describe("buildRawKey", () => {
    it("puts the kind in front of the owner", () => {
      expect(buildRawKey({ kind: RawObjectKind.TITLE_VIDEO, ownerId: OWNER })).toBe(
        `title-video/${OWNER}`,
      );
    });

    it("appends the name when the owner can have several objects", () => {
      expect(
        buildRawKey({ kind: RawObjectKind.USER_AVATAR, ownerId: OWNER, name: "upload-1" }),
      ).toBe(`user-avatar/${OWNER}/upload-1`);
    });
  });

  describe("parseRawKey", () => {
    it("round-trips a key that carries a name", () => {
      const parsed = { kind: RawObjectKind.USER_AVATAR, ownerId: OWNER, name: "upload-1" };

      expect(parseRawKey(buildRawKey(parsed))).toEqual(parsed);
    });

    it("round-trips a key that carries no name", () => {
      const parsed = { kind: RawObjectKind.EPISODE_VIDEO, ownerId: OWNER };

      expect(parseRawKey(buildRawKey(parsed))).toEqual(parsed);
    });

    it.each([
      [RawObjectKind.TITLE_POSTER, "title-poster"],
      [RawObjectKind.SEASON_POSTER, "season-poster"],
      [RawObjectKind.ARTIST_PHOTO, "artist-photo"],
    ])("dispatches %s on its own prefix", (kind, prefix) => {
      const key = buildRawKey({ kind, ownerId: OWNER, name: "upload-1" });

      expect(key.startsWith(`${prefix}/`)).toBe(true);
      expect(parseRawKey(key)).toEqual({ kind, ownerId: OWNER, name: "upload-1" });
    });

    it("keeps slashes inside the name rather than splitting on them", () => {
      expect(parseRawKey(`user-avatar/${OWNER}/a/b/c`)).toEqual({
        kind: RawObjectKind.USER_AVATAR,
        ownerId: OWNER,
        name: "a/b/c",
      });
    });

    it.each([
      ["an unknown prefix", `something-else/${OWNER}`],
      ["no prefix at all", OWNER],
      ["a prefix with no owner", "user-avatar"],
      ["an empty owner segment", "user-avatar//name"],
      ["an empty key", ""],
    ])("returns null for %s", (_case, key) => {
      expect(parseRawKey(key)).toBeNull();
    });
  });

  describe("isLegacyBareUuidKey", () => {
    it("recognises the pre-prefix shape", () => {
      expect(isLegacyBareUuidKey(OWNER)).toBe(true);
    });

    it.each([
      ["a prefixed key", `title-video/${OWNER}`],
      ["a uuid with anything appended", `${OWNER}/extra`],
      ["something that is not a uuid", "not-a-uuid"],
    ])("rejects %s", (_case, key) => {
      expect(isLegacyBareUuidKey(key)).toBe(false);
    });
  });

  describe("buildVideoRawKey", () => {
    it("distinguishes an episode from a title", () => {
      expect(buildVideoRawKey(OWNER, VideoType.EPISODE)).toBe(`episode-video/${OWNER}`);
      expect(buildVideoRawKey(OWNER, VideoType.MOVIE)).toBe(`title-video/${OWNER}`);
    });

    it("produces keys s3-event can dispatch on", () => {
      expect(parseRawKey(buildVideoRawKey(OWNER, VideoType.EPISODE))?.kind).toBe(
        RawObjectKind.EPISODE_VIDEO,
      );
    });
  });

  describe("videoTypeOf", () => {
    it.each([
      [RawObjectKind.TITLE_VIDEO, VideoType.MOVIE],
      [RawObjectKind.EPISODE_VIDEO, VideoType.EPISODE],
    ])("answers the type behind %s", (kind, type) => {
      expect(videoTypeOf(kind)).toBe(type);
    });

    it("answers MOVIE as a defined zero, not as an absent value", () => {
      expect(videoTypeOf(RawObjectKind.TITLE_VIDEO)).toBe(0);
      expect(videoTypeOf(RawObjectKind.TITLE_VIDEO)).not.toBeUndefined();
    });

    it("round-trips with videoKind", () => {
      expect(videoTypeOf(videoKind(VideoType.EPISODE))).toBe(VideoType.EPISODE);
      expect(videoTypeOf(videoKind(VideoType.MOVIE))).toBe(VideoType.MOVIE);
    });

    it("answers nothing for an image kind", () => {
      expect(videoTypeOf(RawObjectKind.USER_AVATAR)).toBeUndefined();
    });
  });

  describe("imageKindOf", () => {
    it.each([
      [RawObjectKind.USER_AVATAR, ImageKind.USER_AVATAR],
      [RawObjectKind.TITLE_POSTER, ImageKind.TITLE_POSTER],
      [RawObjectKind.SEASON_POSTER, ImageKind.SEASON_POSTER],
      [RawObjectKind.ARTIST_PHOTO, ImageKind.ARTIST_PHOTO],
    ])("answers the image kind behind %s", (kind, imageKind) => {
      expect(imageKindOf(kind)).toBe(imageKind);
    });

    it("answers nothing for a video kind", () => {
      expect(imageKindOf(RawObjectKind.EPISODE_VIDEO)).toBeUndefined();
    });
  });

  describe("every kind reaches a pipeline", () => {
    const kinds = Object.values(RawObjectKind);

    it("leaves none unmapped, so s3-event never has to throw", () => {
      const unmapped = kinds.filter(
        (kind) => imageKindOf(kind) === undefined && videoTypeOf(kind) === undefined,
      );

      expect(unmapped).toEqual([]);
    });

    it("sends none to both pipelines", () => {
      const ambiguous = kinds.filter(
        (kind) => imageKindOf(kind) !== undefined && videoTypeOf(kind) !== undefined,
      );

      expect(ambiguous).toEqual([]);
    });
  });
});
