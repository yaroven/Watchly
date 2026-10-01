import { VideoType } from "../../video-transcoder/enums/video-type.enum";
import {
  buildRawKey,
  buildVideoRawKey,
  isLegacyBareUuidKey,
  parseRawKey,
  RawObjectKind,
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
});
