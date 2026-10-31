import { OpenFeature, TypedInMemoryProvider } from "@openfeature/server-sdk";
import { FeatureFlagService } from "./feature-flag.service";

describe("FeatureFlagService", () => {
  const VIEWER_ID = "22222222-2222-4222-8222-222222222222";

  const booleanFlag = (on: boolean) => ({
    variants: { on: true, off: false },
    defaultVariant: on ? ("on" as const) : ("off" as const),
    disabled: false,
  });

  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService(OpenFeature.getClient());
  });

  afterAll(async () => {
    await OpenFeature.close();
  });

  it("should read a flag the provider has", async () => {
    await OpenFeature.setProviderAndWait(
      new TypedInMemoryProvider({ reactions: booleanFlag(true) }),
    );
    await expect(service.isEnabled("reactions")).resolves.toBe(true);

    await OpenFeature.setProviderAndWait(
      new TypedInMemoryProvider({ reactions: booleanFlag(false) }),
    );
    await expect(service.isEnabled("reactions")).resolves.toBe(false);
  });

  it("should fail closed on a flag the provider does not know", async () => {
    await OpenFeature.setProviderAndWait(new TypedInMemoryProvider({}));
    await expect(service.isEnabled("reactions")).resolves.toBe(false);
  });

  it("should hand the viewer to the provider so targeting can see them", async () => {
    await OpenFeature.setProviderAndWait(
      new TypedInMemoryProvider({
        reactions: {
          ...booleanFlag(false),
          contextEvaluator: (ctx) => (ctx.targetingKey === VIEWER_ID ? "on" : "off"),
        },
      }),
    );

    await expect(service.isEnabled("reactions", { targetingKey: VIEWER_ID })).resolves.toBe(true);
    await expect(service.isEnabled("reactions", {})).resolves.toBe(false);
  });

  it("should snapshot every known flag", async () => {
    await OpenFeature.setProviderAndWait(
      new TypedInMemoryProvider({ reactions: booleanFlag(true) }),
    );
    await expect(service.snapshotFor()).resolves.toEqual({ reactions: true });
  });
});
