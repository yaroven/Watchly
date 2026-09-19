import { TitlesLibrary } from "@/features/title";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Content Library | Watchly Admin",
};

export default function Page() {
  // TitlesLibrary keeps its filters in the query string, so prerendering has to
  // bail out to the client for this subtree.
  return (
    <Suspense>
      <TitlesLibrary />
    </Suspense>
  );
}
