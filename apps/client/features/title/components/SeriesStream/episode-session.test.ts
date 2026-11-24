import TranscodingStatus from "@/types/transcoding-status";
import { describe, expect, it } from "vitest";
import { nextEpisode, startEpisode } from "./episode-session";

const episode = (id: string, number: number, transcodingStatus = TranscodingStatus.COMPLETED) => ({ id, number, transcodingStatus });

describe("startEpisode", () => {
  it("opens the requested episode", () => {
    expect(startEpisode([episode("a", 1), episode("b", 2)], "b")?.id).toBe("b");
  });

  it("opens the first playable episode, so next has somewhere to go", () => {
    const episodes = [episode("c", 3), episode("a", 1, TranscodingStatus.PROCESSING), episode("b", 2)];
    expect(startEpisode(episodes)?.id).toBe("b");
  });

  it("ignores a requested id that is not in this season", () => {
    expect(startEpisode([episode("a", 1)], "elsewhere")?.id).toBe("a");
  });
});

describe("nextEpisode", () => {
  it("goes up by episode number, whatever order the list arrived in", () => {
    const episodes = [episode("c", 3), episode("a", 1), episode("b", 2)];
    expect(nextEpisode(episodes, "a")?.id).toBe("b");
  });

  it("skips episodes that are not ready to play", () => {
    const episodes = [episode("a", 1), episode("b", 2, TranscodingStatus.FAILED), episode("c", 3)];
    expect(nextEpisode(episodes, "a")?.id).toBe("c");
  });

  it("stops after the last episode", () => {
    expect(nextEpisode([episode("a", 1), episode("b", 2)], "b")).toBeUndefined();
  });
});
