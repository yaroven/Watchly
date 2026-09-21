/** Compact display count: 5000 -> "5K", 5500 -> "5.5K", 812 -> "812". */
export function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`;
  return String(count);
}
