import type { Mutation } from "@tanstack/react-query";
import { create } from "zustand";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { errorShownInline?: boolean; callerHandlesError?: boolean };
  }
}

export const INLINE_ERROR = { errorShownInline: true } as const;

export function isErrorUnhandled(mutation: Pick<Mutation<unknown, unknown, unknown, unknown>, "meta" | "options">): boolean {
  if (mutation.meta?.errorShownInline) return false;
  if (mutation.meta?.callerHandlesError !== undefined) return !mutation.meta.callerHandlesError;
  return !mutation.options.onError;
}

interface WriteErrorState {
  error: unknown;
  shownAt: number;
  show: (error: unknown) => void;
  dismiss: () => void;
}

export const useWriteErrorStore = create<WriteErrorState>((set) => ({
  error: null,
  shownAt: 0,
  show: (error) => set({ error, shownAt: Date.now() }),
  dismiss: () => set({ error: null }),
}));
