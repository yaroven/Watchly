import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { IsIsoDate } from "./iso-date.decorator";

class Dto {
  @IsIsoDate()
  releaseDate: Date;
}

describe("IsIsoDate", () => {
  // The same options main.ts installs globally; the conversion only happens
  // because `transform` is on.
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const metadata = { type: "body" as const, metatype: Dto };

  const run = (value: unknown) => pipe.transform({ releaseDate: value }, metadata);

  it("hands the service a Date, not the string it was sent", async () => {
    const dto = (await run("2026-01-01")) as Dto;

    expect(dto.releaseDate).toBeInstanceOf(Date);
    expect(dto.releaseDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("keeps the time of day when one is sent", async () => {
    const dto = (await run("2026-01-01T21:30:00.000Z")) as Dto;

    expect(dto.releaseDate.toISOString()).toBe("2026-01-01T21:30:00.000Z");
  });

  // `new Date("2026-13-45")` is an Invalid Date, which would reach Prisma as a
  // column write that fails far from the request that caused it.
  it("refuses a string the Date constructor cannot parse", async () => {
    await expect(run("2026-13-45")).rejects.toThrow(BadRequestException);
  });

  /**
   * The wire contract stays "a date string". `new Date(1767225600000)` is a
   * perfectly good Date, which is exactly why the transform leaves non-strings
   * alone and lets validation reject them.
   */
  it.each([
    ["a timestamp number", 1767225600000],
    ["an object", { year: 2026 }],
    ["null", null],
  ])("refuses %s", async (_case, value) => {
    await expect(run(value)).rejects.toThrow(BadRequestException);
  });
});
