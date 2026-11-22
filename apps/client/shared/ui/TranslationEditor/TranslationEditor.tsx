"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Input from "@mui/material/Input";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { inputVariants, tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import { useState } from "react";
import {
  isSameTranslation,
  toTranslationValues,
  trimTranslationValues,
  validateTranslation,
  type TranslationFieldError,
  type TranslationFieldSpec,
  type TranslationValues,
} from "./translation-values";

export interface TranslationEditorField<K extends string> extends TranslationFieldSpec<K> {
  label: string;
  multiline?: boolean;
}

export interface TranslationEditorLabels {
  hint: string;
  notTranslated: string;
  save: string;
  saving: string;
  remove: string;
  removing: string;
  required: string;
  tooLong: (max: number) => string;
  loadFailed: string;
}

export type TranslationEditorMessageKey =
  "hint" | "notTranslated" | "save" | "saving" | "remove" | "removing" | "required" | "tooLong" | "loadFailed";

export const translationEditorLabels = (
  t: (key: TranslationEditorMessageKey, values?: { max?: number; language?: string }) => string,
  language: string,
): TranslationEditorLabels => ({
  hint: t("hint", { language }),
  notTranslated: t("notTranslated", { language }),
  save: t("save"),
  saving: t("saving"),
  remove: t("remove"),
  removing: t("removing"),
  required: t("required"),
  tooLong: (max) => t("tooLong", { max }),
  loadFailed: t("loadFailed"),
});

export interface TranslationFeedback {
  severity: "success" | "error";
  text: string;
}

interface TranslationEditorProps<K extends string> {
  idPrefix: string;
  fields: readonly TranslationEditorField<K>[];
  stored: Partial<Record<K, string>> | null;
  isLoading: boolean;
  isLoadError: boolean;
  isSaving: boolean;
  isRemoving: boolean;
  onSave: (values: TranslationValues<K>) => void;
  onRemove: () => void;
  feedback: TranslationFeedback | null;
  onDismissFeedback: () => void;
  labels: TranslationEditorLabels;
}

export default function TranslationEditor<K extends string>({
  idPrefix,
  fields,
  stored,
  isLoading,
  isLoadError,
  isSaving,
  isRemoving,
  onSave,
  onRemove,
  feedback,
  onDismissFeedback,
  labels,
}: TranslationEditorProps<K>) {
  const [syncedStored, setSyncedStored] = useState(stored);
  const [values, setValues] = useState(() => toTranslationValues(fields, stored));
  const [errors, setErrors] = useState<Partial<Record<K, TranslationFieldError>>>({});

  if (stored !== syncedStored) {
    setSyncedStored(stored);
    setValues(toTranslationValues(fields, stored));
    setErrors({});
  }

  const isBusy = isSaving || isRemoving;
  const isUnchanged = stored !== null && isSameTranslation(fields, values, toTranslationValues(fields, stored));

  const handleSave = () => {
    const trimmed = trimTranslationValues(values);
    const nextErrors = validateTranslation(fields, trimmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(trimmed);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {fields.map(({ name }) => (
          <Skeleton key={name} variant="rounded" height={48} sx={{ borderRadius: "12px" }} />
        ))}
      </Box>
    );
  }

  if (isLoadError) return <Alert severity="error">{labels.loadFailed}</Alert>;

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
      sx={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      {feedback && (
        <Alert severity={feedback.severity} onClose={onDismissFeedback}>
          {feedback.text}
        </Alert>
      )}

      <Typography sx={{ fontSize: "14px", color: tokens.text.secondary }}>{labels.hint}</Typography>

      {stored === null && (
        <Typography
          sx={{
            fontSize: "13px",
            color: tokens.text.secondary,
            border: `1px dashed ${tokens.border.subtle}`,
            borderRadius: "10px",
            px: "12px",
            py: "8px",
          }}
        >
          {labels.notTranslated}
        </Typography>
      )}

      {fields.map(({ name, label, maxLength, multiline }) => {
        const fieldId = `${idPrefix}-${name}`;
        const error = errors[name];
        const errorId = error ? `${fieldId}-error` : undefined;

        return (
          <Box key={name} sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Typography component="label" htmlFor={fieldId} sx={{ fontSize: "14px", color: tokens.text.secondary }}>
              {label}
            </Typography>
            <Input
              id={fieldId}
              value={values[name]}
              onChange={(event) => setValues((prev) => ({ ...prev, [name]: event.target.value }))}
              error={Boolean(error)}
              aria-describedby={errorId}
              disabled={isBusy}
              multiline={multiline}
              minRows={multiline ? 3 : undefined}
              disableUnderline
              sx={[inputVariants.pill, Boolean(multiline) && { height: "auto", paddingBlock: "10px" }]}
            />
            {error && (
              <Typography id={errorId} role="alert" sx={{ fontSize: "12px", color: tokens.feedback.error }}>
                {error === "required" ? labels.required : labels.tooLong(maxLength)}
              </Typography>
            )}
          </Box>
        );
      })}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
        {stored !== null && (
          <Button variant="outlined" danger onClick={onRemove} disabled={isBusy}>
            {isRemoving ? labels.removing : labels.remove}
          </Button>
        )}
        <Button type="submit" variant="contained" disabled={isBusy || isUnchanged}>
          {isSaving ? labels.saving : labels.save}
        </Button>
      </Box>
    </Box>
  );
}
