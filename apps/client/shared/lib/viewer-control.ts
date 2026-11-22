import type { Viewer } from "./use-viewer";

export type ViewerControlState = "pending" | "anonymous" | "unknown" | "ready";

export interface ViewerControl {
  state: ViewerControlState;
  disabled: boolean;
  dimmed: boolean;
  intent: "write" | "sign-in" | "ignore";
}

export interface ViewerControlInput {
  viewer: Viewer["status"];
  known: boolean;
  refreshFailed?: boolean;
  busy?: boolean;
}

export function viewerControl({ viewer, known, refreshFailed = false, busy = false }: ViewerControlInput): ViewerControl {
  const state: ViewerControlState =
    viewer === "pending" ? "pending" : viewer === "anonymous" ? "anonymous" : !known || refreshFailed ? "unknown" : "ready";

  const intent = state === "anonymous" ? "sign-in" : state === "ready" && !busy ? "write" : "ignore";

  return {
    state,
    disabled: intent === "ignore",
    dimmed: state === "anonymous" || state === "unknown",
    intent,
  };
}

export const nextVote = <T>(held: T | null, clicked: T): T | null => (held === clicked ? null : clicked);
