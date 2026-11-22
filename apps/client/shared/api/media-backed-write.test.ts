import { describe, expect, it } from "vitest";
import { combinedProgress, createWithMedia, type MediaAsset, updateWithMedia } from "./media-backed-write";

interface Entity {
  id: string;
  poster?: string;
}

function fakeAdapter() {
  const log: string[] = [];
  const store = new Map<string, Entity>();
  const asset = (name: string, weight: number, fail = false): MediaAsset => ({
    weight,
    upload: async (onProgress) => {
      onProgress(50);
      if (fail) throw new Error(`${name} upload failed`);
      log.push(`upload:${name}`);
      const entity = store.get("e-1");
      if (entity) store.set("e-1", { ...entity, poster: name });
    },
  });
  return {
    log,
    store,
    asset,
    create: async (): Promise<Entity> => {
      log.push("create");
      const entity: Entity = { id: "e-1" };
      store.set(entity.id, entity);
      return entity;
    },
    update: async () => {
      log.push("update");
      return store.get("e-1") ?? { id: "e-1" };
    },
    remove: async (entity: Entity) => {
      log.push(`remove:${entity.id}`);
      store.delete(entity.id);
    },
    reload: async (entity: Entity) => store.get(entity.id)!,
  };
}

describe("createWithMedia", () => {
  it("creates, uploads every asset, then returns the entity as it is after the uploads", async () => {
    const fake = fakeAdapter();

    const result = await createWithMedia({
      create: fake.create,
      assets: () => [fake.asset("poster", 1)],
      remove: fake.remove,
      reload: fake.reload,
    });

    expect(fake.log).toEqual(["create", "upload:poster"]);
    expect(result.poster).toBe("poster");
  });

  it("removes the entity when an upload fails, so no orphan is left behind", async () => {
    const fake = fakeAdapter();

    await expect(
      createWithMedia({
        create: fake.create,
        assets: () => [fake.asset("poster", 1), fake.asset("video", 9, true)],
        remove: fake.remove,
      }),
    ).rejects.toThrow("video upload failed");

    expect(fake.log).toEqual(["create", "upload:poster", "remove:e-1"]);
    expect(fake.store.size).toBe(0);
  });

  it("skips assets the form did not pick a file for", async () => {
    const fake = fakeAdapter();

    await createWithMedia({ create: fake.create, assets: () => [null], remove: fake.remove, reload: fake.reload });

    expect(fake.log).toEqual(["create"]);
  });
});

describe("updateWithMedia", () => {
  it("saves the fields before touching media, so a rejected update changes nothing", async () => {
    const fake = fakeAdapter();
    const failingUpdate = async (): Promise<Entity> => {
      fake.log.push("update");
      throw new Error("validation");
    };

    await expect(updateWithMedia({ update: failingUpdate, assets: () => [fake.asset("poster", 1)] })).rejects.toThrow("validation");

    expect(fake.log).toEqual(["update"]);
  });
});

describe("combinedProgress", () => {
  it("reports one bar across assets, weighted by size, that never goes back", () => {
    const seen: number[] = [];
    const [poster, video] = combinedProgress([1, 9], (percent) => seen.push(percent));

    poster(100);
    video(0);
    video(50);
    video(100);

    expect(seen).toEqual([10, 55, 100]);
  });
});

describe("the rollback boundary", () => {
  it("keeps an entity whose uploads were confirmed when reading it back fails", async () => {
    const fake = fakeAdapter();

    const result = await createWithMedia({
      create: fake.create,
      assets: () => [fake.asset("poster", 1)],
      remove: fake.remove,
      reload: async () => {
        throw new Error("502 on GET");
      },
    });

    expect(fake.log).toEqual(["create", "upload:poster"]);
    expect(fake.store.has("e-1")).toBe(true);
    expect(result.id).toBe("e-1");
  });
});
