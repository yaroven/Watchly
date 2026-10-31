import * as path from "path";
import { FfmpegJob } from "../../../ffmpeg/ffmpeg.types";
import { HLS_SEGMENT_SECONDS, VIDEO_VARIANTS, VideoVariant } from "../video-profile.const";

export const variantsFor = (sourceWidth: number): readonly VideoVariant[] => {
  const fitting = VIDEO_VARIANTS.filter((variant) => variant.width <= sourceWidth);

  return fitting.length > 0 ? fitting : [VIDEO_VARIANTS[VIDEO_VARIANTS.length - 1]];
};

export const buildHlsJob = (input: string, outputDir: string, sourceWidth: number): FfmpegJob => {
  const variants = variantsFor(sourceWidth);

  return {
    input,
    output: path.join(outputDir, "%v/index.m3u8"),
    format: "hls",
    outputOptions: [
      "-hls_time",
      String(HLS_SEGMENT_SECONDS),
      "-hls_playlist_type",
      "vod",
      "-master_pl_name",
      "master.m3u8",
      ...variants.flatMap((variant, index) => [
        "-map",
        "0:v",
        "-map",
        "0:a",
        `-s:v:${index}`,
        `${variant.width}x${variant.height}`,
        `-b:v:${index}`,
        variant.bitrate,
      ]),
      "-var_stream_map",
      variants.map((_, index) => `v:${index},a:${index}`).join(" "),
    ],
  };
};
