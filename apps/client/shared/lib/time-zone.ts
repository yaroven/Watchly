export const TIME_ZONE_COOKIE = "tz";

export const FALLBACK_TIME_ZONE = "Europe/Kyiv";

export function isValidTimeZone(value: string | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
