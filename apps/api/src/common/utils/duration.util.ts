const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** Parses jsonwebtoken-style durations ("30d", "1h", "15m") into milliseconds. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration "${value}" — expected e.g. "30d", "1h", "15m"`);

  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
