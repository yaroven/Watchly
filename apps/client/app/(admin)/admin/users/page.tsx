import { UsersLibrary } from "@/features/user";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Users | Watchly Admin",
};

export default function Page() {
  // UsersLibrary keeps its filters in the query string, so prerendering has to
  // bail out to the client for this subtree.
  return (
    <Suspense>
      <UsersLibrary />
    </Suspense>
  );
}
