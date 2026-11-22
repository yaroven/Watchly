import TranscodingStatus from "@/types/transcoding-status";
import { describe, expect, it } from "vitest";
import { TRANSCODING_POLL_MS, transcodingPollInterval } from "./polling";

describe("transcodingPollInterval", () => {
  it("polls while any video is still queued or being transcoded", () => {
    expect(transcodingPollInterval([TranscodingStatus.COMPLETED, TranscodingStatus.PROCESSING])).toBe(TRANSCODING_POLL_MS);
    expect(transcodingPollInterval([TranscodingStatus.PENDING])).toBe(TRANSCODING_POLL_MS);
  });

  it("stops once every video has finished, failed or there is nothing to watch", () => {
    expect(transcodingPollInterval([TranscodingStatus.COMPLETED, TranscodingStatus.FAILED])).toBe(false);
    expect(transcodingPollInterval([])).toBe(false);
  });
});
