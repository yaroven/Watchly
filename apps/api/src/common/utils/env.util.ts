export function requireInProduction(
  value: string | undefined,
  envVar: string,
  devDefault: string,
): string {
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
  return devDefault;
}
