"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { BASE_CONTENT_LOCALE, type ContentLocale, type TranslationLocale } from "./content-locale";

interface EditingLanguage {
  language: ContentLocale;
  setLanguage: (language: ContentLocale) => void;
  isBase: boolean;
  translationLocale: TranslationLocale | null;
}

const EditingLanguageContext = createContext<EditingLanguage | null>(null);

export function EditingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<ContentLocale>(BASE_CONTENT_LOCALE);
  const value = useMemo<EditingLanguage>(() => {
    const isBase = language === BASE_CONTENT_LOCALE;
    return { language, setLanguage, isBase, translationLocale: isBase ? null : (language as TranslationLocale) };
  }, [language]);
  return <EditingLanguageContext.Provider value={value}>{children}</EditingLanguageContext.Provider>;
}

const BASE_ONLY: EditingLanguage = { language: BASE_CONTENT_LOCALE, setLanguage: () => {}, isBase: true, translationLocale: null };

export function useEditingLanguage(): EditingLanguage {
  return useContext(EditingLanguageContext) ?? BASE_ONLY;
}
