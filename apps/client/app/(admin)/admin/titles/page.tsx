import { TitlesLibrary } from "@/features/title";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Content Library | Watchly Admin",
};

export default function Page() {
  return (
    <Suspense>
      <TitlesLibrary />
    </Suspense>
  );
}
