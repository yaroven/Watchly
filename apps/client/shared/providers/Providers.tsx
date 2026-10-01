"use client";

import { restoreSession } from "@shared/api/axios";
import { authStore } from "@shared/lib/auth-store";
import MuiThemeProvider from "@shared/mui/MuiThemeProvider";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // A failed write has no rendered state of its own to fall back on: the UI
        // shows server values, so a rejected click leaves the control identical to
        // before it. Unconditional on purpose — a call site that handles one
        // failure for its own narrow purpose should not silence the rest.
        //
        // Still only a console line. Nothing shows the viewer anything, which is
        // the open half: it wants an app-level snackbar reading from this cache.
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            console.error("[Mutation failed]", mutation.options.mutationKey ?? "", error);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  useEffect(() => {
    // Guards against React Strict Mode's double-invoke in dev — the second run sees
    // "loading" (or "resolved", if the first run already finished) and skips.
    if (authStore.getState().status !== "idle") return;

    authStore.getState().setStatus("loading");
    restoreSession().finally(() => authStore.getState().setStatus("resolved"));
  }, []);

  return (
    <MuiThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>{children}</NuqsAdapter>
      </QueryClientProvider>
    </MuiThemeProvider>
  );
}
