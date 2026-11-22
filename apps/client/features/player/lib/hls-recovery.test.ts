import { describe, expect, it } from "vitest";
import { MAX_HLS_RECOVERIES, nextHlsRecovery } from "./hls-recovery";

describe("nextHlsRecovery", () => {
  it("retries a network error and recovers a media error", () => {
    expect(nextHlsRecovery("network", 0)).toBe("restart-load");
    expect(nextHlsRecovery("media", 1)).toBe("recover-media");
  });

  it("gives up once the retry budget is spent, instead of retrying forever", () => {
    expect(nextHlsRecovery("network", MAX_HLS_RECOVERIES)).toBe("give-up");
    expect(nextHlsRecovery("media", MAX_HLS_RECOVERIES + 4)).toBe("give-up");
  });

  it("gives up straight away on an error it cannot recover", () => {
    expect(nextHlsRecovery("other", 0)).toBe("give-up");
  });
});
