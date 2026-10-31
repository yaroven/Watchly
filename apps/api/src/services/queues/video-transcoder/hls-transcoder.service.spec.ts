import { FfmpegRunner } from "../../ffmpeg/ffmpeg.runner";
import { FfmpegHooks, FfmpegJob, MediaStream } from "../../ffmpeg/ffmpeg.types";
import { HlsTranscoder, HlsTranscodeRequest } from "./hls-transcoder.service";
import { TranscodeAbortedError } from "./utils/transcode-aborted.error";
import { PROGRESS_INTERVAL_MS } from "./video-profile.const";

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("HlsTranscoder", () => {
  let transcoder: HlsTranscoder;
  let runner: { start: jest.Mock; probe: jest.Mock };
  let hooks: FfmpegHooks;
  let jobs: FfmpegJob[];
  let finish: () => void;
  let fail: (error: Error) => void;
  let kill: jest.Mock;
  let now: number;

  const request = (overrides: Partial<HlsTranscodeRequest> = {}): HlsTranscodeRequest => ({
    input: "/work/in.mp4",
    outputDir: "/work/out",
    sourceWidth: 1280,
    onProgress: jest.fn(),
    shouldAbort: jest.fn().mockResolvedValue(false),
    ...overrides,
  });

  const progress = (percent: number | undefined, at: number) => {
    now = at;
    hooks.onProgress?.(percent);
  };

  beforeEach(() => {
    jobs = [];
    kill = jest.fn();
    now = 0;
    jest.spyOn(Date, "now").mockImplementation(() => now);

    runner = {
      probe: jest.fn(),
      start: jest.fn((job: FfmpegJob, given: FfmpegHooks) => {
        jobs.push(job);
        hooks = given;
        const done = new Promise<void>((resolve, reject) => {
          finish = resolve;
          fail = reject;
        });
        return { done, kill };
      }),
    };

    transcoder = new HlsTranscoder(runner as unknown as FfmpegRunner);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("probeWidth", () => {
    const streams = (...list: MediaStream[]) => runner.probe.mockResolvedValue({ streams: list });

    it("reads the width of the first video stream", async () => {
      streams({ kind: "audio" }, { kind: "video", width: 1920 }, { kind: "video", width: 640 });

      await expect(transcoder.probeWidth("/work/in.mp4")).resolves.toBe(1920);
    });

    it("answers 0 for a file with no video stream", async () => {
      streams({ kind: "audio" });

      await expect(transcoder.probeWidth("/work/in.mp4")).resolves.toBe(0);
    });
  });

  describe("run", () => {
    it("transcodes the ladder that fits the source", async () => {
      const running = transcoder.run(request({ sourceWidth: 1280 }));
      finish();
      await running;

      expect(jobs[0].output).toBe("/work/out/%v/index.m3u8");
      expect(jobs[0].outputOptions.slice(-1)).toEqual(["v:0,a:0 v:1,a:1"]);
    });

    it("fails the way ffmpeg failed when nothing asked it to stop", async () => {
      const running = transcoder.run(request());
      fail(new Error("Conversion failed!"));

      await expect(running).rejects.toThrow("Conversion failed!");
    });

    it("reports progress rounded, at most once per interval", async () => {
      const onProgress = jest.fn();
      const running = transcoder.run(request({ onProgress }));

      progress(12.6, PROGRESS_INTERVAL_MS + 1);
      progress(20, PROGRESS_INTERVAL_MS + 10);
      progress(undefined, PROGRESS_INTERVAL_MS * 2 + 2);
      finish();
      await running;

      expect(onProgress.mock.calls).toEqual([[13], [0]]);
    });

    it("kills ffmpeg and reports an abort when the entity is gone", async () => {
      const shouldAbort = jest.fn().mockResolvedValue(true);
      const running = transcoder.run(request({ shouldAbort }));

      progress(50, PROGRESS_INTERVAL_MS + 1);
      await flush();
      expect(kill).toHaveBeenCalledTimes(1);

      fail(new Error("ffmpeg was killed with signal SIGKILL"));
      await expect(running).rejects.toThrow(TranscodeAbortedError);
    });

    it("keeps going when the abort check itself fails", async () => {
      const shouldAbort = jest.fn().mockRejectedValue(new Error("db down"));
      const running = transcoder.run(request({ shouldAbort }));

      progress(50, PROGRESS_INTERVAL_MS + 1);
      await flush();
      finish();

      await expect(running).resolves.toBeUndefined();
      expect(kill).not.toHaveBeenCalled();
    });
  });
});
