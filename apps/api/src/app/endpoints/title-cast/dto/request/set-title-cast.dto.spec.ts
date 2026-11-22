import { ValidationPipe } from "@nestjs/common";
import { SetTitleCastDto } from "./set-title-cast.dto";

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (body: unknown) =>
  pipe.transform(body, { type: "body", metatype: SetTitleCastDto });

const ARTIST = "11111111-1111-4111-8111-111111111111";

describe("SetTitleCastDto character translations", () => {
  it("should accept a Ukrainian character name", async () => {
    await expect(
      validate({ credits: [{ artistId: ARTIST, characterTranslations: { uk: "Нео" } }] }),
    ).resolves.toBeInstanceOf(SetTitleCastDto);
  });

  it("should reject an English key, since English is the character field itself", async () => {
    await expect(
      validate({ credits: [{ artistId: ARTIST, characterTranslations: { en: "Neo" } }] }),
    ).rejects.toThrow();
  });

  it("should reject a locale that is not supported", async () => {
    await expect(
      validate({ credits: [{ artistId: ARTIST, characterTranslations: { de: "Neo" } }] }),
    ).rejects.toThrow();
  });

  it("should reject a name longer than the character field allows", async () => {
    await expect(
      validate({ credits: [{ artistId: ARTIST, characterTranslations: { uk: "x".repeat(256) } }] }),
    ).rejects.toThrow();
  });
});
