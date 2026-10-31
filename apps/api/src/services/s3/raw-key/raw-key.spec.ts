import { buildRawKey, parseRawKey, RawObjectKind } from "./raw-key";

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
});
