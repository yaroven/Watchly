import { ValidationPipe } from "@nestjs/common";
import { GenreTranslationDto, NameDescriptionTranslationDto } from "./translation.dto";

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

describe("NameDescriptionTranslationDto", () => {
  const validate = (body: unknown) =>
    pipe.transform(body, { type: "body", metatype: NameDescriptionTranslationDto });

  it("should accept a complete translation", async () => {
    await expect(
      validate({ name: "Віднесені привидами", description: "Дівчинка у світі духів." }),
    ).resolves.toBeInstanceOf(NameDescriptionTranslationDto);
  });

  it("should reject a translation with a name and no description", async () => {
    await expect(validate({ name: "Віднесені привидами" })).rejects.toThrow();
  });

  it("should reject a name over the English field's limit", async () => {
    await expect(validate({ name: "x".repeat(256), description: "ok" })).rejects.toThrow();
  });

  it("should reject a field the entity does not have", async () => {
    await expect(validate({ name: "a", description: "b", director: "c" })).rejects.toThrow();
  });
});

describe("GenreTranslationDto", () => {
  const validate = (body: unknown) =>
    pipe.transform(body, { type: "body", metatype: GenreTranslationDto });

  it("should accept a name within the genre limit and reject one over it", async () => {
    await expect(validate({ name: "Драма" })).resolves.toBeInstanceOf(GenreTranslationDto);
    await expect(validate({ name: "x".repeat(101) })).rejects.toThrow();
  });
});
