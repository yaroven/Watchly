import { UsersLibrary } from "@/features/user";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Users | Watchly Admin",
};

export default function Page() {
  return (
    <Suspense>
      <UsersLibrary />
    </Suspense>
  );
}
