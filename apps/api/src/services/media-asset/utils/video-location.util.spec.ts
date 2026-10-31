import { VideoType } from "../../queues/video-transcoder/enums/video-type.enum";
import { parseRawKey, RawObjectKind } from "../../s3/raw-key";
import { rawVideoKey } from "./video-location.util";

const OWNER = "773bca63-f8ca-439f-ab2f-d28c333afa13";

describe("video location", () => {
  describe("rawVideoKey", () => {
    it("distinguishes an episode from a title", () => {
      expect(rawVideoKey(OWNER, VideoType.EPISODE)).toBe(`episode-video/${OWNER}`);
      expect(rawVideoKey(OWNER, VideoType.MOVIE)).toBe(`title-video/${OWNER}`);
    });

    it("produces keys parseRawKey reads back as a video kind", () => {
      expect(parseRawKey(rawVideoKey(OWNER, VideoType.EPISODE))?.kind).toBe(
        RawObjectKind.EPISODE_VIDEO,
      );
    });
  });
});
