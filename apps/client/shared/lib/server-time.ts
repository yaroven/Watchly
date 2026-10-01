/**
 * The server's clock, as far as we can observe it.
 *
 * Every HTTP response carries a `Date` header, so one request is enough to learn
 * how far this device is off. Without that offset a machine whose clock is wrong
 * by more than a token lifetime reads **every** access token as expired — including
 * one minted a millisecond ago — and the client refreshes on every single request,
 * forever, rotating the refresh cookie each time.
 *
 * Only used to decide when to refresh. Nothing is authorised on it.
 */
let offsetMs = 0;
let learned = false;

export function recordServerTime(dateHeader: string | undefined): void {
  if (!dateHeader) return;

  const serverMs = Date.parse(dateHeader);
  if (Number.isNaN(serverMs)) return;

  offsetMs = serverMs - Date.now();
  learned = true;
}

/** `Date.now()` corrected towards the server, or plain `Date.now()` until we have heard from it. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function hasLearnedServerTime(): boolean {
  return learned;
}

/** Test seam: module state would otherwise leak between cases. */
export function __resetServerTimeForTests(): void {
  offsetMs = 0;
  learned = false;
}
