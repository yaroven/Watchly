import { Module } from "@nestjs/common";
import { FfmpegRunner } from "./ffmpeg.runner";

@Module({
  providers: [FfmpegRunner],
  exports: [FfmpegRunner],
})
export class FfmpegModule {}
