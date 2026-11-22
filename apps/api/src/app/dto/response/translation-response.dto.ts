import { ApiProperty } from "@nestjs/swagger";
import { TRANSLATION_LOCALES, type TranslationLocale } from "../../../common/locale.const";
import {
  NameDescriptionTranslation,
  NameTranslation,
  TranslationView,
} from "../../../common/translation.types";

export class NameDescriptionTranslationResponseDto implements TranslationView<NameDescriptionTranslation> {
  @ApiProperty({ enum: TRANSLATION_LOCALES })
  locale: TranslationLocale;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}

export class GenreTranslationResponseDto implements TranslationView<NameTranslation> {
  @ApiProperty({ enum: TRANSLATION_LOCALES })
  locale: TranslationLocale;

  @ApiProperty()
  name: string;
}
