import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import {
  BASE_LOCALE,
  isTranslationLocale,
  TRANSLATION_LOCALES,
  TranslationLocale,
} from "../locale.const";

@Injectable()
export class TranslationLocalePipe implements PipeTransform<string, TranslationLocale> {
  transform(value: string): TranslationLocale {
    if (isTranslationLocale(value)) return value;

    throw new BadRequestException(
      value === BASE_LOCALE
        ? "English is the base content; edit it on the entity itself, not as a translation"
        : `Unsupported translation locale "${value}"; expected one of: ${TRANSLATION_LOCALES.join(", ")}`,
    );
  }
}
