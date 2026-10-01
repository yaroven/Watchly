"use client";

import { useAuthStore } from "./auth-store";

/**
 * Identity for cache keys of anything whose response depends on who is asking.
 *
 * `viewerKey` is the cache dimension; `"anonymous"` covers both a signed-out
 * viewer and the boot window before the refresh cookie has been exchanged, since
 * the request that goes out in that window is itself anonymous. The cost is one
 * extra fetch per cold load for a signed-in viewer, once the key re-keys to their
 * id — the alternative, blocking every title read on the session, delays first
 * paint for everyone.
 *
 * `sessionReady` is for "may I decide yet"; `isSignedIn` for "is there a viewer".
 * They are not interchangeable: a control disabled on `!isSignedIn` during boot
 * is disabled for a viewer who *is* signed in, and one dimmed on `!sessionReady`
 * alone is bright and dead for a viewer who is not.
 *
 * Title and title-engagement keys carry the viewer. Rating and comment keys do
 * **not** yet — `titleRatingKeys.detail` and `commentKeys.list` are shared across
 * viewers even though `myScore` and `myReaction` are per-viewer, so a sign-out in
 * the same tab still leaves the previous viewer's values in those caches.
 */
export function useViewer() {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);

  return {
    viewerKey: userId ?? "anonymous",
    isSignedIn: Boolean(userId) && status === "resolved",
    sessionReady: status === "resolved",
  };
}
