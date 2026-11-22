import { describe, expect, it } from "vitest";
import { isErrorUnhandled } from "./write-errors";

const mutation = (meta: { errorShownInline?: boolean; callerHandlesError?: boolean } | undefined, onError?: () => void) =>
  ({ meta, options: { onError } }) as Parameters<typeof isErrorUnhandled>[0];

describe("isErrorUnhandled", () => {
  it("surfaces a failed write that nothing else shows", () => {
    expect(isErrorUnhandled(mutation(undefined))).toBe(true);
  });

  it("stays quiet when the caller handles the error", () => {
    expect(isErrorUnhandled(mutation(undefined, () => undefined))).toBe(false);
  });

  it("stays quiet when the screen shows the error next to the control", () => {
    expect(isErrorUnhandled(mutation({ errorShownInline: true }))).toBe(false);
  });

  it("trusts the runner's word over its own onError, which every runner mutation has", () => {
    expect(isErrorUnhandled(mutation({ callerHandlesError: false }, () => undefined))).toBe(true);
    expect(isErrorUnhandled(mutation({ callerHandlesError: true }, () => undefined))).toBe(false);
  });
});
