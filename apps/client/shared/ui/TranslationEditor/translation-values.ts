export interface TranslationFieldSpec<K extends string> {
  name: K;
  maxLength: number;
}

export type TranslationValues<K extends string> = Record<K, string>;

export type TranslationFieldError = "required" | "tooLong";

export function toTranslationValues<K extends string>(
  fields: readonly TranslationFieldSpec<K>[],
  stored: Partial<Record<K, string>> | null | undefined,
): TranslationValues<K> {
  return Object.fromEntries(fields.map(({ name }) => [name, stored?.[name] ?? ""])) as TranslationValues<K>;
}

export function trimTranslationValues<K extends string>(values: TranslationValues<K>): TranslationValues<K> {
  return Object.fromEntries(Object.entries<string>(values).map(([name, value]) => [name, value.trim()])) as TranslationValues<K>;
}

export function validateTranslation<K extends string>(
  fields: readonly TranslationFieldSpec<K>[],
  values: TranslationValues<K>,
): Partial<Record<K, TranslationFieldError>> {
  const errors: Partial<Record<K, TranslationFieldError>> = {};
  for (const { name, maxLength } of fields) {
    const value = values[name];
    if (!value) errors[name] = "required";
    else if (value.length > maxLength) errors[name] = "tooLong";
  }
  return errors;
}

export function isSameTranslation<K extends string>(
  fields: readonly TranslationFieldSpec<K>[],
  a: TranslationValues<K>,
  b: TranslationValues<K>,
): boolean {
  return fields.every(({ name }) => a[name].trim() === b[name].trim());
}
