import { ImageKind } from "../queues/image-transcoder/image-profile.const";
import { ImageAttacher, imageAttachersProvider } from "./image.attacher";
import { ImageService } from "./image.service";

describe("ImageAttacher", () => {
  const images = {
    buildProcessedKey: jest.fn().mockReturnValue("key"),
    attachProcessed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ImageService>;

  afterEach(() => jest.clearAllMocks());

  it("builds the key for its own kind", () => {
    new ImageAttacher(images, ImageKind.SEASON_POSTER).buildKey("season-1", "v1");

    expect(images.buildProcessedKey).toHaveBeenCalledWith(
      ImageKind.SEASON_POSTER,
      "season-1",
      "v1",
    );
  });

  it("attaches to its own kind", async () => {
    await new ImageAttacher(images, ImageKind.USER_AVATAR).attach("user-1", "key");

    expect(images.attachProcessed).toHaveBeenCalledWith(ImageKind.USER_AVATAR, "user-1", "key");
  });

  it("gives the worker one attacher per image kind, none missing", () => {
    const attachers = (
      imageAttachersProvider as { useFactory: (service: ImageService) => ImageAttacher[] }
    ).useFactory(images);

    expect(attachers.map((attacher) => attacher.kind).sort()).toEqual(
      Object.values(ImageKind).sort(),
    );
  });
});
