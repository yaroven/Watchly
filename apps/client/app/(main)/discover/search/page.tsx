import { SearchResults } from "@features/title";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Search | Watchly",
};

export default function Page() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
