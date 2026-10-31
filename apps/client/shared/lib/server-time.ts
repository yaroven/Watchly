let offsetMs = 0;
let learned = false;

export function recordServerTime(dateHeader: string | undefined): void {
  if (!dateHeader) return;

  const serverMs = Date.parse(dateHeader);
  if (Number.isNaN(serverMs)) return;

  offsetMs = serverMs - Date.now();
  learned = true;
}

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function hasLearnedServerTime(): boolean {
  return learned;
}

export function __resetServerTimeForTests(): void {
  offsetMs = 0;
  learned = false;
}
