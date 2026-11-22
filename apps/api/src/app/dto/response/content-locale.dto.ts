import { ApiProperty } from "@nestjs/swagger";
import { SUPPORTED_LOCALES, type Locale } from "../../../common/locale.const";
import { ContentLocaleView } from "../../../common/utils/localize.util";

export class ContentLocaleDto implements ContentLocaleView {
  @ApiProperty({ enum: SUPPORTED_LOCALES, description: "The language this entity's text is in" })
  locale: Locale;

  @ApiProperty({
    description:
      "True when the request asked for another language that this entity has no translation in",
  })
  fallback: boolean;
}
