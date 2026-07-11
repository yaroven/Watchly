export function parseApiDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
