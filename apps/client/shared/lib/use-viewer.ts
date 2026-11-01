"use client";

import { useMemo } from "react";
import { useAuthStore } from "./auth-store";

export type ViewerKey = string & { readonly __viewerKey: unique symbol };

export type Viewer =
  | { status: "pending"; viewerKey: ViewerKey }
  | { status: "anonymous"; viewerKey: ViewerKey }
  | { status: "signed-in"; viewerKey: ViewerKey; userId: string };

const ANONYMOUS_KEY = "anonymous" as ViewerKey;

export function useViewer(): Viewer {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);

  return useMemo(() => {
    const viewerKey = (userId ?? ANONYMOUS_KEY) as ViewerKey;

    if (status !== "resolved") return { status: "pending", viewerKey };
    if (!userId) return { status: "anonymous", viewerKey };
    return { status: "signed-in", viewerKey, userId };
  }, [status, userId]);
}
