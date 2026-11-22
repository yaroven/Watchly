export function nextNumber(items: readonly { number: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.number), 0) + 1;
}
