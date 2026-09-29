"use client";

import { restoreSession } from "@shared/api/axios";
import { authStore } from "@shared/lib/auth-store";
import MuiThemeProvider from "@shared/mui/MuiThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
