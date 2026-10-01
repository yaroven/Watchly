"use client";

import { useMemo } from "react";
import { useAuthStore } from "./auth-store";

/**
 * A cache-key dimension, mintable only here. Branded so a call site cannot pass a
 * bare string — `detailFor(id, "anonymous")` would compile and quietly share one
 * entry between viewers, and two positional strings can be swapped unnoticed.
 */
export type ViewerKey = string & { readonly __viewerKey: unique symbol };

/**
 * Who is asking, as three states rather than independent booleans.
 *
 * A union because the booleans it replaced were mutually constraining in ways
 * nothing enforced: a control disabled on "not signed in" during `pending` is
 * disabled for someone who *is* signed in, and one dimmed on `pending` alone is
 * bright and dead for someone who is not. Both mistakes shipped.
 */
export type Viewer =
  | { status: "pending"; viewerKey: ViewerKey }
  | { status: "anonymous"; viewerKey: ViewerKey }
  | { status: "signed-in"; viewerKey: ViewerKey; userId: string };

const ANONYMOUS_KEY = "anonymous" as ViewerKey;

/**
 * Identity for cache keys of anything whose response depends on who is asking.
 *
 * `pending` and `anonymous` share a key on purpose: the request that goes out
 * during the boot exchange is itself anonymous, so it belongs in the anonymous
 * entry. The cost is one extra fetch per cold load once the key re-keys to the
 * viewer's id; blocking every title read on the session would delay first paint
 * for everyone instead.
 *
 * Title and title-engagement keys carry the viewer. Rating and comment keys do
 * **not** yet — `titleRatingKeys.detail` and `commentKeys.list` are shared across
 * viewers even though `myScore` and `myReaction` are per-viewer, so a sign-out in
 * the same tab still leaves the previous viewer's values in those caches.
 */
export function useViewer(): Viewer {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);

  return useMemo(() => {
    if (status !== "resolved") return { status: "pending", viewerKey: ANONYMOUS_KEY };
    if (!userId) return { status: "anonymous", viewerKey: ANONYMOUS_KEY };
    return { status: "signed-in", viewerKey: userId as ViewerKey, userId };
  }, [status, userId]);
}
