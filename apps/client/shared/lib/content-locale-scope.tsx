"use client";

import { useLocale } from "next-intl";
import { createContext, type ReactNode, useContext } from "react";
import { BASE_CONTENT_LOCALE, type ContentLocale } from "./content-locale";

const ContentLocaleScopeContext = createContext<ContentLocale | null>(null);

export function BaseContentScope({ children }: { children: ReactNode }) {
  return <ContentLocaleScopeContext.Provider value={BASE_CONTENT_LOCALE}>{children}</ContentLocaleScopeContext.Provider>;
}

export function useContentLocale(explicit?: ContentLocale): ContentLocale {
  const scoped = useContext(ContentLocaleScopeContext);
  const pageLocale = useLocale() as ContentLocale;
  return explicit ?? scoped ?? pageLocale;
}
