"use client";

import { useMemo } from "react";
import { useAuthStore } from "./auth-store";

/**
 * A cache-key dimension. The brand rejects a bare `string`, so
 * `detailFor(id, "anonymous")` and swapped positional arguments stop compiling —
 * which is the mistake worth catching. It does not make the type unforgeable:
 * `"x" as ViewerKey` still compiles anywhere, and nothing lints for that.
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
 * A cold load keys as anonymous until the refresh exchange produces an identity,
 * then re-keys — one extra fetch, rather than blocking every title read on the
 * session and delaying first paint for everyone.
 *
 * Every key whose response is viewer-dependent now carries it: title, title-engagement,
 * title-rating and comment. Each of those key objects names its viewer-less rungs
 * `*Prefix` and keeps them for invalidation only.
 */
export function useViewer(): Viewer {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);

  return useMemo(() => {
    // The key follows `userId`, not `status`. Restoring a session writes the
    // identity and flips the status in two separate store updates, so there is a
    // render where the token is already attached to outgoing requests while the
    // status is still "loading" — keying that render as anonymous would file the
    // viewer's own data under the shared key, which is the leak this type exists
    // to prevent. `status` answers "may I decide yet", never "whose data is this".
    const viewerKey = (userId ?? ANONYMOUS_KEY) as ViewerKey;

    if (status !== "resolved") return { status: "pending", viewerKey };
    if (!userId) return { status: "anonymous", viewerKey };
    return { status: "signed-in", viewerKey, userId };
  }, [status, userId]);
}
