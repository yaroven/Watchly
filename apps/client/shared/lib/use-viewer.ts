"use client";

import { useAuthStore } from "./auth-store";

/**
 * Identity for cache keys of anything whose response depends on who is asking.
 *
 * Every such key has to carry it: the title payload now includes the viewer's own
 * `engagement`, so a single shared key would serve one person's likes and watchlist
 * to the next — on sign-out, on a second sign-in in the same tab, and during the
 * boot window before the refresh cookie has been exchanged, when the request goes
 * out anonymous and answers 200 rather than 401.
 */
export function useViewer() {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);

  return {
    /** Stable per identity; "anonymous" is a real identity, not a missing one. */
    viewerKey: userId ?? "anonymous",
    isSignedIn: Boolean(userId) && status === "resolved",
    sessionReady: status === "resolved",
  };
}
