import { VIDEO_VARIANTS } from "../video-profile.const";
import { buildHlsJob, variantsFor } from "./hls-job.util";

const names = (sourceWidth: number) => variantsFor(sourceWidth).map((variant) => variant.name);

describe("variantsFor", () => {
  it("offers every rung when the source is wider than the top one", () => {
    expect(names(3840)).toEqual(["1440p", "1080p", "720p", "480p"]);
  });

  it("includes a rung exactly as wide as the source", () => {
    expect(names(1920)).toEqual(["1080p", "720p", "480p"]);
  });

  it("never upscales past the source", () => {
    expect(names(1919)).toEqual(["720p", "480p"]);
  });

  it("falls back to the smallest rung for a source narrower than all of them", () => {
    expect(names(320)).toEqual(["480p"]);
  });

  it("treats an unreadable width of 0 like a tiny source", () => {
    expect(names(0)).toEqual(["480p"]);
  });
});

describe("buildHlsJob", () => {
  it("writes one playlist per variant under the output directory", () => {
    const job = buildHlsJob("/work/in.mp4", "/work/out", 1280);

    expect(job.input).toBe("/work/in.mp4");
    expect(job.output).toBe("/work/out/%v/index.m3u8");
    expect(job.format).toBe("hls");
  });

  it("asks for VOD segments and a master playlist", () => {
    const { outputOptions } = buildHlsJob("/in", "/out", 1280);

    expect(outputOptions.slice(0, 6)).toEqual([
      "-hls_time",
      "6",
      "-hls_playlist_type",
      "vod",
      "-master_pl_name",
      "master.m3u8",
    ]);
  });

  it("numbers each variant's size and bitrate by its position", () => {
    const { outputOptions } = buildHlsJob("/in", "/out", 1280);

    expect(outputOptions).toEqual(
      expect.arrayContaining(["-s:v:0", "1280x720", "-b:v:0", "2800k"]),
    );
    expect(outputOptions).toEqual(expect.arrayContaining(["-s:v:1", "854x480", "-b:v:1", "1400k"]));
    expect(outputOptions).not.toContain("-s:v:2");
  });

  it("maps video and audio once per variant", () => {
    const { outputOptions } = buildHlsJob("/in", "/out", 99999);
    const maps = outputOptions.filter((option) => option === "-map");

    expect(maps).toHaveLength(VIDEO_VARIANTS.length * 2);
  });

  it("pairs every variant's streams in one space-separated stream map, last", () => {
    const { outputOptions } = buildHlsJob("/in", "/out", 1920);

    expect(outputOptions.slice(-2)).toEqual(["-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2"]);
  });
});
