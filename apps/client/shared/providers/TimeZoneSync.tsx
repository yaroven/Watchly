"use client";

import { isValidTimeZone, TIME_ZONE_COOKIE } from "@shared/lib/time-zone";
import { useTimeZone } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export default function TimeZoneSync() {
  const renderedTimeZone = useTimeZone();
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidTimeZone(browserTimeZone)) return;
    if (readCookie(TIME_ZONE_COOKIE) === encodeURIComponent(browserTimeZone)) return;

    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(browserTimeZone)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;

    if (browserTimeZone !== renderedTimeZone) {
      router.refresh();
    }
  }, [renderedTimeZone, router]);

  return null;
}
