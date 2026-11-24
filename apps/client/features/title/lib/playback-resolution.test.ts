import TranscodingStatus from "@/types/transcoding-status";
import { describe, expect, it, vi } from "vitest";
import { resolveCurrentSeason, resolveStreamUrl } from "./playback-resolution";

const { COMPLETED, PROCESSING } = TranscodingStatus;
const season = (id: string, number: number) => ({ id, number });
const episode = (id: string, number: number, transcodingStatus = COMPLETED) => ({ id, number, transcodingStatus });

function ports(bySeason: Record<string, ReturnType<typeof episode>[]>, seasonOf: Record<string, string> = {}) {
  return {
    seasons: async () => [season("s3", 3), season("s1", 1), season("s2", 2)],
    episodes: vi.fn(async (id: string) => bySeason[id] ?? []),
    seasonOfEpisode: async (id: string) => seasonOf[id] ?? null,
  };
}

describe("resolveCurrentSeason", () => {
  it("opens the first season that has something to play, on both the details and the watch page", async () => {
    const result = await resolveCurrentSeason(
      ports({ s1: [episode("e1", 1, PROCESSING)], s2: [episode("e2", 1)], s3: [episode("e3", 1)] }),
    );
    expect(result.season?.id).toBe("s2");
  });

  it("follows the season a requested episode belongs to", async () => {
    const result = await resolveCurrentSeason(ports({ s1: [episode("e1", 1)], s3: [episode("e3", 1)] }, { e3: "s3" }), { episodeId: "e3" });
    expect(result.season?.id).toBe("s3");
  });

  it("honours a requested season", async () => {
    const result = await resolveCurrentSeason(ports({ s1: [episode("e1", 1)], s2: [] }), { seasonId: "s2" });
    expect(result.season?.id).toBe("s2");
  });

  it("falls back to the first season with episodes, then to the first season", async () => {
    expect((await resolveCurrentSeason(ports({ s2: [episode("e2", 1, PROCESSING)] }))).season?.id).toBe("s2");
    expect((await resolveCurrentSeason(ports({}))).season?.id).toBe("s1");
  });
});

describe("resolveStreamUrl", () => {
  it("asks for a URL only when there is a video to play, and never fails the page", async () => {
    const fetchUrl = vi.fn(async () => "https://cdn/x.m3u8");
    expect(await resolveStreamUrl({ transcodingStatus: PROCESSING }, fetchUrl)).toBe("");
    expect(fetchUrl).not.toHaveBeenCalled();
    expect(await resolveStreamUrl({ transcodingStatus: COMPLETED }, async () => Promise.reject(new Error("404")))).toBe("");
    expect(await resolveStreamUrl({ transcodingStatus: COMPLETED }, fetchUrl)).toBe("https://cdn/x.m3u8");
  });
});
