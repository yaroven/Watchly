import ffmpeg from "fluent-ffmpeg";
import { FfmpegRunner } from "./ffmpeg.runner";
import { FfmpegJob } from "./ffmpeg.types";

type Command = ffmpeg.FfmpegCommand & { _getArguments(): string[] };

describe("FfmpegRunner", () => {
  let runner: FfmpegRunner;
  let started: Command[];
  let argv: string[][];

  const job = (overrides: Partial<FfmpegJob> = {}): FfmpegJob => ({
    input: "/work/in.mp4",
    output: "/work/out.m3u8",
    outputOptions: [],
    ...overrides,
  });

  beforeEach(() => {
    runner = new FfmpegRunner();
    started = [];
    argv = [];
    jest.spyOn(ffmpeg.prototype, "run").mockImplementation(function (this: Command) {
      started.push(this);
      argv.push(this._getArguments());
      return this;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  describe("building the command", () => {
    it("passes the input, the options in order and the output last", () => {
      void runner.start(job({ format: "hls", outputOptions: ["-hls_time", "6", "-map", "0:v"] }));

      expect(argv[0]).toEqual([
        "-i",
        "/work/in.mp4",
        "-y",
        "-f",
        "hls",
        "-hls_time",
        "6",
        "-map",
        "0:v",
        "/work/out.m3u8",
      ]);
    });

    it("keeps an option value that contains a space as one argument", () => {
      void runner.start(job({ outputOptions: ["-var_stream_map", "v:0,a:0 v:1,a:1"] }));

      expect(argv[0]).toContain("v:0,a:0 v:1,a:1");
      expect(argv[0]).not.toContain("v:1,a:1");
    });

    it("applies video filters and a frame limit when the job has them", () => {
      void runner.start(job({ videoFilters: ["scale=10:10", "crop=10:10"], frames: 1 }));

      expect(argv[0]).toEqual(
        expect.arrayContaining(["-filter:v", "scale=10:10,crop=10:10", "-vframes", 1]),
      );
    });

    it("adds no format, filter or frame flags the job did not ask for", () => {
      void runner.start(job());

      expect(argv[0]).toEqual(["-i", "/work/in.mp4", "-y", "/work/out.m3u8"]);
    });
  });

  describe("the handle", () => {
    it("resolves when ffmpeg ends", async () => {
      const { done } = runner.start(job());
      started[0].emit("end");

      await expect(done).resolves.toBeUndefined();
    });

    it("rejects with ffmpeg's own error", async () => {
      const { done } = runner.start(job());
      started[0].emit("error", new Error("Invalid data found when processing input"));

      await expect(done).rejects.toThrow("Invalid data found when processing input");
    });

    it("kills the process with SIGKILL", () => {
      const handle = runner.start(job());
      const kill = jest.spyOn(started[0], "kill").mockReturnValue(started[0]);

      handle.kill();

      expect(kill).toHaveBeenCalledWith("SIGKILL");
    });

    it("hands progress and the command line to the hooks", () => {
      const onProgress = jest.fn();
      const onStart = jest.fn();
      void runner.start(job(), { onProgress, onStart });

      started[0].emit("start", "ffmpeg -i /work/in.mp4");
      started[0].emit("progress", { percent: 42.5 });
      started[0].emit("progress", {});

      expect(onStart).toHaveBeenCalledWith("ffmpeg -i /work/in.mp4");
      expect(onProgress).toHaveBeenNthCalledWith(1, 42.5);
      expect(onProgress).toHaveBeenNthCalledWith(2, undefined);
    });
  });

  describe("probe", () => {
    const probeAnswers = (error: Error | null, streams: object[] = []) =>
      jest
        .spyOn(ffmpeg, "ffprobe")
        .mockImplementation(((_path: string, callback: (e: unknown, d: unknown) => void) =>
          callback(error, { streams })) as never);

    it("answers our own stream shape, not ffprobe's", async () => {
      probeAnswers(null, [
        { codec_type: "video", width: 1920, height: 1080, codec_name: "h264" },
        { codec_type: "audio", codec_name: "aac" },
        { codec_type: "data" },
      ]);

      await expect(runner.probe("/work/in.mp4")).resolves.toEqual({
        streams: [
          { kind: "video", width: 1920, height: 1080 },
          { kind: "audio", width: undefined, height: undefined },
          { kind: "other", width: undefined, height: undefined },
        ],
      });
    });

    it("rejects when ffprobe cannot read the file", async () => {
      probeAnswers(new Error("moov atom not found"));

      await expect(runner.probe("/work/in.mp4")).rejects.toThrow("moov atom not found");
    });
  });
});
