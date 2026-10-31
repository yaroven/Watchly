import { videoTypeOfRawKind } from "../../media-asset/utils/video-location.util";
import { ImageKind } from "../../queues/image-transcoder/image-profile.const";
import { RawObjectKind } from "../../s3/raw-key";
import { imageKindOfRawKind } from "./image-target.const";

describe("image targets by raw kind", () => {
  describe("imageKindOfRawKind", () => {
    it.each([
      [RawObjectKind.USER_AVATAR, ImageKind.USER_AVATAR],
      [RawObjectKind.TITLE_POSTER, ImageKind.TITLE_POSTER],
      [RawObjectKind.SEASON_POSTER, ImageKind.SEASON_POSTER],
      [RawObjectKind.ARTIST_PHOTO, ImageKind.ARTIST_PHOTO],
    ])("answers the image kind behind %s", (kind, imageKind) => {
      expect(imageKindOfRawKind(kind)).toBe(imageKind);
    });

    it("answers nothing for a video kind", () => {
      expect(imageKindOfRawKind(RawObjectKind.EPISODE_VIDEO)).toBeUndefined();
    });
  });

  describe("every kind reaches a pipeline", () => {
    const kinds = Object.values(RawObjectKind);

    it("leaves none unmapped, so s3-event never has to throw", () => {
      const unmapped = kinds.filter(
        (kind) => imageKindOfRawKind(kind) === undefined && videoTypeOfRawKind(kind) === undefined,
      );

      expect(unmapped).toEqual([]);
    });

    it("sends none to both pipelines", () => {
      const ambiguous = kinds.filter(
        (kind) => imageKindOfRawKind(kind) !== undefined && videoTypeOfRawKind(kind) !== undefined,
      );

      expect(ambiguous).toEqual([]);
    });
  });
});
