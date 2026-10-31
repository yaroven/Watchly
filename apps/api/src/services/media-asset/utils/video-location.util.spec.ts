import { VideoType } from "../../queues/video-transcoder/enums/video-type.enum";
import { parseRawKey, RawObjectKind } from "../../s3/raw-key";
import { rawVideoKey, videoTypeOfRawKind } from "./video-location.util";

const OWNER = "773bca63-f8ca-439f-ab2f-d28c333afa13";

describe("video location", () => {
  describe("rawVideoKey", () => {
    it("distinguishes an episode from a title", () => {
      expect(rawVideoKey(OWNER, VideoType.EPISODE)).toBe(`episode-video/${OWNER}`);
      expect(rawVideoKey(OWNER, VideoType.MOVIE)).toBe(`title-video/${OWNER}`);
    });

    it("produces keys s3-event can dispatch on", () => {
      expect(parseRawKey(rawVideoKey(OWNER, VideoType.EPISODE))?.kind).toBe(
        RawObjectKind.EPISODE_VIDEO,
      );
    });
  });

  describe("videoTypeOfRawKind", () => {
    it.each([
      [RawObjectKind.TITLE_VIDEO, VideoType.MOVIE],
      [RawObjectKind.EPISODE_VIDEO, VideoType.EPISODE],
    ])("answers the type behind %s", (kind, type) => {
      expect(videoTypeOfRawKind(kind)).toBe(type);
    });

    it("answers MOVIE as a defined zero, not as an absent value", () => {
      expect(videoTypeOfRawKind(RawObjectKind.TITLE_VIDEO)).toBe(0);
      expect(videoTypeOfRawKind(RawObjectKind.TITLE_VIDEO)).not.toBeUndefined();
    });

    it.each([VideoType.EPISODE, VideoType.MOVIE])("round-trips with rawVideoKey for %s", (type) => {
      expect(videoTypeOfRawKind(parseRawKey(rawVideoKey(OWNER, type))!.kind)).toBe(type);
    });

    it("answers nothing for an image kind", () => {
      expect(videoTypeOfRawKind(RawObjectKind.USER_AVATAR)).toBeUndefined();
    });
  });
});
