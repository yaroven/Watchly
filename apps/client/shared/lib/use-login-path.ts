"use client";

import { usePathname } from "@/i18n/navigation";
import { useCallback } from "react";
import { loginPath } from "./login-redirect";

export function useLoginPath(): () => string {
  const pathname = usePathname();
  return useCallback(() => loginPath(`${pathname}${typeof window === "undefined" ? "" : window.location.search}`), [pathname]);
}
