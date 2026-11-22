import { BadRequestException } from "@nestjs/common";
import { TranslationLocalePipe } from "./translation-locale.pipe";

describe("TranslationLocalePipe", () => {
  const pipe = new TranslationLocalePipe();

  it("should pass a supported translation locale through", () => {
    expect(pipe.transform("uk")).toBe("uk");
  });

  it("should refuse English, which is edited on the entity itself", () => {
    expect(() => pipe.transform("en")).toThrow(BadRequestException);
    expect(() => pipe.transform("en")).toThrow(/base content/);
  });

  it("should refuse a locale that is not supported", () => {
    expect(() => pipe.transform("de")).toThrow(BadRequestException);
  });
});
