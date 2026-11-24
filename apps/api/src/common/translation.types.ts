import { TranslationLocale } from "./locale.const";

export interface NameDescriptionTranslation {
  name: string;
  description: string;
}

export interface NameTranslation {
  name: string;
}

export type TranslationView<F> = F & { locale: TranslationLocale };
