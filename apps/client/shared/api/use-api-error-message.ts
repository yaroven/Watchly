"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { describeApiError } from "./api-error";

export function useApiErrorMessage() {
  const t = useTranslations("errors");
  return useCallback(
    (error: unknown, overrides?: Partial<Record<number, string>>) => (error ? describeApiError(error, t, overrides) : null),
    [t],
  );
}
