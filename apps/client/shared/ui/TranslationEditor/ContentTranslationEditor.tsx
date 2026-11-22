"use client";

import { describeApiError } from "@shared/api/api-error";
import { type TranslatableContent, useContentTranslations, useContentTranslationWrites } from "@shared/api/content-translations";
import { languageName, pickTranslation, type TranslationLocale } from "@shared/lib/content-locale";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import TranslationEditor, { translationEditorLabels, type TranslationFeedback } from "./TranslationEditor";

interface ContentTranslationEditorProps<K extends string> {
  content: TranslatableContent<K>;
  id: string;
  locale: TranslationLocale;
}

export default function ContentTranslationEditor<K extends string>({ content, id, locale }: ContentTranslationEditorProps<K>) {
  const t = useTranslations(content.messages);
  const tErrors = useTranslations("errors");
  const language = languageName(locale, useLocale());
  const [feedback, setFeedback] = useState<TranslationFeedback | null>(null);

  const { data: translations, isPending, isError } = useContentTranslations(content, id);
  const { save, remove } = useContentTranslationWrites(content, id, locale, {
    onSaved: () => setFeedback({ severity: "success", text: t("saved", { language }) }),
    onRemoved: () => setFeedback({ severity: "success", text: t("removed", { language }) }),
    onError: (error) => setFeedback({ severity: "error", text: describeApiError(error, tErrors) }),
  });

  return (
    <TranslationEditor
      idPrefix={`${content.kind}-${id}-${locale}`}
      fields={content.fields.map((field) => ({ ...field, label: t(field.name as string) }))}
      stored={pickTranslation(translations, locale)}
      isLoading={isPending}
      isLoadError={isError && !translations}
      isSaving={save.isPending}
      isRemoving={remove.isPending}
      onSave={(values) => {
        setFeedback(null);
        save.mutate(values);
      }}
      onRemove={() => {
        setFeedback(null);
        remove.mutate();
      }}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      labels={translationEditorLabels(t, language)}
    />
  );
}
