"use client";

import type { ContentTranslation, TranslationLocale } from "@shared/lib/content-locale";
import { type QueryKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TranslatableField<K extends string> {
  name: K;
  maxLength: number;
  multiline?: boolean;
}

export interface TranslatableContent<K extends string> {
  kind: string;
  messages: string;
  fields: readonly TranslatableField<K>[];
  translationsKey: (id: string) => QueryKey;
  copies: (id: string) => QueryKey[];
  list: (id: string) => Promise<ContentTranslation<Record<K, string>>[]>;
  save: (id: string, locale: TranslationLocale, values: Record<K, string>) => Promise<unknown>;
  remove: (id: string, locale: TranslationLocale) => Promise<void>;
}

export function useContentTranslations<K extends string>(content: TranslatableContent<K>, id: string) {
  return useQuery({ queryKey: content.translationsKey(id), queryFn: () => content.list(id) });
}

interface WriteCallbacks {
  onSaved: () => void;
  onRemoved: () => void;
  onError: (error: Error) => void;
}

export function useContentTranslationWrites<K extends string>(
  content: TranslatableContent<K>,
  id: string,
  locale: TranslationLocale,
  { onSaved, onRemoved, onError }: WriteCallbacks,
) {
  const queryClient = useQueryClient();
  const refresh = () => Promise.all(content.copies(id).map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const save = useMutation({
    mutationFn: (values: Record<K, string>) => content.save(id, locale, values),
    onSuccess: async () => {
      await refresh();
      onSaved();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => content.remove(id, locale),
    onSuccess: async () => {
      await refresh();
      onRemoved();
    },
    onError,
  });

  return { save, remove };
}
