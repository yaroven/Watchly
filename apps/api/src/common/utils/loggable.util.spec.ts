import { Readable } from "stream";
import { REDACTED, toLoggable } from "./loggable.util";

describe("toLoggable", () => {
  it("should redact secret keys at any depth and keep the rest", () => {
    const input = {
      email: "a@b.c",
      password: "hunter2",
      user: { id: "u1", passwordHash: "x", refreshToken: "y" },
      headers: { authorization: "Bearer z" },
    };

    expect(toLoggable(input)).toEqual({
      email: "a@b.c",
      password: REDACTED,
      user: { id: "u1", passwordHash: REDACTED, refreshToken: REDACTED },
      headers: { authorization: REDACTED },
    });
  });

  it("should strip the signature off a presigned URL", () => {
    const url =
      "http://s3/raw/key.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AK&X-Amz-Signature=abc";

    expect(toLoggable({ url })).toEqual({ url: `http://s3/raw/key.mp4?${REDACTED}` });
  });

  it("should not touch the value it was given", () => {
    const input = { password: "hunter2" };

    toLoggable(input);

    expect(input.password).toBe("hunter2");
  });

  it("should cap long lists and long strings", () => {
    const list = toLoggable(Array.from({ length: 25 }, (_, i) => i)) as unknown[];
    const text = toLoggable("x".repeat(600)) as string;

    expect(list).toHaveLength(21);
    expect(list[20]).toBe("…5 more");
    expect(text.startsWith("x".repeat(500))).toBe(true);
    expect(text).toContain("(600 chars)");
  });

  it("should summarise buffers, streams and clients instead of dumping them", () => {
    expect(toLoggable(Buffer.alloc(3))).toBe("[Buffer 3 bytes]");
    expect(toLoggable(Readable.from([]))).toBe("[Readable]");
    expect(toLoggable({ $queryRaw: jest.fn() })).toBe("[PrismaClient]");
  });

  it("should survive cycles and stop at the depth limit", () => {
    const cyclic: Record<string, unknown> = { id: "c" };
    cyclic.self = cyclic;
    const deep = { a: { b: { c: { d: { e: 1 } } } } };

    expect(toLoggable(cyclic)).toEqual({ id: "c", self: "[Circular]" });
    expect(toLoggable(deep)).toEqual({ a: { b: { c: { d: "[Object]" } } } });
  });
});
