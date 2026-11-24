import { BASE_LOCALE, isSupportedLocale, Locale } from "../locale.const";

type Preference = { language: string; quality: number; position: number };

function parsePreference(entry: string, position: number): Preference | null {
  const [tag, ...params] = entry.trim().split(";");
  const language = tag.trim().toLowerCase().split("-")[0];
  if (!language || language === "*") return null;

  let quality = 1;
  for (const param of params) {
    const [key, value] = param.trim().split("=");
    if (key?.trim().toLowerCase() !== "q") continue;
    const parsed = Number(value);
    quality = Number.isFinite(parsed) ? parsed : 0;
  }

  return quality > 0 ? { language, quality, position } : null;
}

export function negotiateLocale(header: string | string[] | undefined): Locale {
  const value = Array.isArray(header) ? header.join(",") : header;
  if (!value) return BASE_LOCALE;

  const preferences = value
    .split(",")
    .map(parsePreference)
    .filter((preference): preference is Preference => preference !== null)
    .sort((a, b) => b.quality - a.quality || a.position - b.position);

  return (
    (preferences.find((preference) => isSupportedLocale(preference.language))?.language as
      Locale | undefined) ?? BASE_LOCALE
  );
}
