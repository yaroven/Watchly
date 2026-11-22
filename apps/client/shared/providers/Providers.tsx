"use client";

import { restoreSession } from "@shared/api/axios";
import { isErrorUnhandled, useWriteErrorStore } from "@shared/api/write-errors";
import { authStore } from "@shared/lib/auth-store";
import MuiThemeProvider from "@shared/mui/MuiThemeProvider";
import WriteErrorToast from "@shared/ui/WriteErrorToast";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, useState } from "react";
import TimeZoneSync from "./TimeZoneSync";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            console.error("[Mutation failed]", mutation.options.mutationKey ?? "", error);
            if (isErrorUnhandled(mutation)) useWriteErrorStore.getState().show(error);
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
    if (authStore.getState().status !== "idle") return;

    authStore.getState().setStatus("loading");
    restoreSession().finally(() => authStore.getState().setStatus("resolved"));
  }, []);

  return (
    <MuiThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <TimeZoneSync />
          {children}
          <WriteErrorToast />
        </NuqsAdapter>
      </QueryClientProvider>
    </MuiThemeProvider>
  );
}
